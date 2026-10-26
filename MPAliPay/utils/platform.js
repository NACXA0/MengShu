/**
 * 支付宝 API 薄封装。无 my 时退回内存，便于 Node 断言。
 */
var mem = {};

function hasMy() {
  return typeof my !== 'undefined' && my;
}

function setStorage(key, data) {
  if (hasMy()) {
    try {
      my.setStorageSync({ key: key, data: data });
      return true;
    } catch (e) {
      console.warn('[platform] setStorage', e);
      return false;
    }
  }
  mem[key] = data;
  return true;
}

function getStorage(key) {
  if (hasMy()) {
    try {
      var res = my.getStorageSync({ key: key });
      if (res && Object.prototype.hasOwnProperty.call(res, 'data')) return res.data;
      return res;
    } catch (e) {
      return null;
    }
  }
  return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
}

function removeStorage(key) {
  if (hasMy()) {
    try {
      my.removeStorageSync({ key: key });
    } catch (e) {}
    return;
  }
  delete mem[key];
}

function clearStorage() {
  if (hasMy()) {
    try {
      my.clearStorageSync();
    } catch (e) {}
    return;
  }
  mem = {};
}

/** 测试用：清空内存仓 */
function __resetMem() {
  mem = {};
}

function navigateTo(url) {
  if (hasMy()) my.navigateTo({ url: url });
}

function redirectTo(url) {
  if (hasMy()) my.redirectTo({ url: url });
}

function switchTab(url) {
  if (hasMy()) my.switchTab({ url: url });
}

function navigateBack(delta) {
  if (hasMy()) my.navigateBack({ delta: delta || 1 });
}

function setClipboard(text) {
  if (hasMy()) {
    my.setClipboard({ text: String(text || '') });
    return;
  }
}

function scanCode(cb) {
  if (!hasMy() || typeof my.scan !== 'function') {
    if (typeof cb === 'function') cb(null);
    return;
  }
  my.scan({
    type: 'qr',
    success: function (res) {
      cb(res && (res.code || res.result) ? String(res.code || res.result) : '');
    },
    fail: function () {
      cb(null);
    },
  });
}

function vibrateShort() {
  if (hasMy() && typeof my.vibrateShort === 'function') {
    try {
      my.vibrateShort();
    } catch (e) {}
  }
}

function setNavigationBar(opts) {
  if (!hasMy() || typeof my.setNavigationBar !== 'function') return;
  try {
    my.setNavigationBar(opts);
  } catch (e) {}
}

function getSystemInfo() {
  if (hasMy()) {
    try {
      return my.getSystemInfoSync() || {};
    } catch (e) {
      return {};
    }
  }
  return { statusBarHeight: 44, titleBarHeight: 48, window: 'phone', windowWidth: 375 };
}

/**
 * 尝试静默授权。成功返回 authCode（仅内存用），失败返回 null。
 * 演示壳不把 authCode 发给任何服务端。
 */
function tryGetAuthCode(cb) {
  if (!hasMy() || typeof my.getAuthCode !== 'function') {
    cb(null);
    return;
  }
  try {
    my.getAuthCode({
      scopes: 'auth_base',
      success: function (res) {
        cb((res && res.authCode) || null);
      },
      fail: function () {
        cb(null);
      },
    });
  } catch (e) {
    cb(null);
  }
}

function getCurrentPagesSafe() {
  try {
    if (typeof getCurrentPages === 'function') return getCurrentPages() || [];
  } catch (e) {}
  return [];
}

module.exports = {
  setStorage: setStorage,
  getStorage: getStorage,
  removeStorage: removeStorage,
  clearStorage: clearStorage,
  __resetMem: __resetMem,
  navigateTo: navigateTo,
  redirectTo: redirectTo,
  switchTab: switchTab,
  navigateBack: navigateBack,
  setClipboard: setClipboard,
  scanCode: scanCode,
  vibrateShort: vibrateShort,
  setNavigationBar: setNavigationBar,
  getSystemInfo: getSystemInfo,
  tryGetAuthCode: tryGetAuthCode,
  getCurrentPagesSafe: getCurrentPagesSafe,
  hasMy: hasMy,
};
