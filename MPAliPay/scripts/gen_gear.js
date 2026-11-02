/**
 * 生成设置齿轮图标 PNG（assets/icons/gear-*.png）。
 * 零依赖：Node 内置 zlib 手写 PNG 编码 + 抗锯齿齿形光栅化。
 * 运行：node MPAliPay/scripts/gen_gear.js
 */
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var SIZE = 96;
var SS = 3; // 每像素超采样
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

/** 线性齿轮：8 齿外环 + 中心孔，stroke 风格。返回 [0..1] 覆盖率 */
function gearCoverage(x, y) {
  var cx = SIZE / 2;
  var cy = SIZE / 2;
  var r1 = 16; // 中心孔半径
  var r2 = 30; // 环内径（体）
  var r3 = 40; // 环外径
  var r4 = 48; // 齿顶半径
  var dx = x - cx;
  var dy = y - cy;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < r1 - 1 || d > r4) return 0;

  var ring = d >= r2 - 1 && d <= r3;
  var tooth = false;
  if (d > r3 && d <= r4) {
    var ang = Math.atan2(dy, dx);
    var seg = Math.PI / 4; // 8 齿
    var t = ((ang % seg) + seg) % seg;
    var halfTooth = seg * 0.3;
    tooth = t <= halfTooth || t >= seg - halfTooth;
  }
  return ring || tooth ? 1 : 0;
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
          cov += gearCoverage(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        }
      }
      cov /= SS * SS;
      var o = (y * SIZE + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = Math.round(cov * 235);
    }
  }
  return encodePng(rgba, SIZE, SIZE);
}

var variants = {
  'gear-night.png': '#E8DCC0', // 深蓝底（Vault 首页）上的暖亮齿轮
  'gear-ink.png': '#4A5568', // 亮色底用墨色齿轮
};

Object.keys(variants).forEach(function (file) {
  var out = path.join(OUT_DIR, file);
  fs.writeFileSync(out, render(variants[file]));
  console.log('  gen  ' + path.relative(path.join(__dirname, '..', '..'), out));
});
console.log('gear icons generated');
