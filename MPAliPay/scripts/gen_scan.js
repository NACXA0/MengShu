/**
 * 生成扫码图标 PNG（assets/icons/scan-*.png）。
 * 零依赖：Node 内置 zlib 手写 PNG 编码 + 超采样抗锯齿。
 * 运行：node MPAliPay/scripts/gen_scan.js
 */
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var SIZE = 96;
var SS = 4; // 每像素超采样
var OUT_DIR = path.join(__dirname, '..', 'assets', 'icons');

function crc32(buf) {
  var table = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  var crc = 0xffffffff;
  for (var i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  var body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, w, h) {
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 判断点 (x,y) 是否属于扫码框图案，返回 0/1 */
function scanPixel(x, y) {
  var margin = 10;
  var armLen = 36; // 每条 L 臂长度
  var thick = 8;
  var lineThick = 6;

  // 左上角
  if (x >= margin && x < margin + armLen && y >= margin && y < margin + thick) return 1;
  if (x >= margin && x < margin + thick && y >= margin && y < margin + armLen) return 1;

  // 右上角
  if (x >= SIZE - margin - armLen && x < SIZE - margin && y >= margin && y < margin + thick) return 1;
  if (x >= SIZE - margin - thick && x < SIZE - margin && y >= margin && y < margin + armLen) return 1;

  // 左下角
  if (x >= margin && x < margin + armLen && y >= SIZE - margin - thick && y < SIZE - margin) return 1;
  if (x >= margin && x < margin + thick && y >= SIZE - margin - armLen && y < SIZE - margin) return 1;

  // 右下角
  if (x >= SIZE - margin - armLen && x < SIZE - margin && y >= SIZE - margin - thick && y < SIZE - margin) return 1;
  if (x >= SIZE - margin - thick && x < SIZE - margin && y >= SIZE - margin - armLen && y < SIZE - margin) return 1;

  // 中间横线
  var cy = SIZE / 2;
  if (y >= cy - lineThick / 2 && y < cy + lineThick / 2 && x >= margin + 6 && x < SIZE - margin - 6) return 1;

  return 0;
}

function render(hex) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var rgba = Buffer.alloc(SIZE * SIZE * 4);
  for (var y = 0; y < SIZE; y++) {
    for (var x = 0; x < SIZE; x++) {
      var cov = 0;
      for (var sy = 0; sy < SS; sy++) {
        for (var sx = 0; sx < SS; sx++) {
          var px = x + (sx + 0.5) / SS;
          var py = y + (sy + 0.5) / SS;
          cov += scanPixel(px, py);
        }
      }
      cov /= SS * SS;
      var o = (y * SIZE + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = Math.round(cov * 255);
    }
  }
  return encodePng(rgba, SIZE, SIZE);
}

var variants = {
  'scan-night.png': '#E8ECEF',
  'scan-ink.png': '#1A1A1A',
};

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
Object.keys(variants).forEach(function (file) {
  var out = path.join(OUT_DIR, file);
  fs.writeFileSync(out, render(variants[file]));
  console.log('  gen  ' + path.relative(path.join(__dirname, '..', '..'), out));
});
console.log('scan icons generated');
