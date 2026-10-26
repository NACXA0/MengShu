var platform = require('./platform');

var STORAGE_KEY = 'mengshu_appearance_v1';

var LIGHT_CHROME = {
  frontColor: '#000000',
  backgroundColor: '#FAFBFC',
};

var DARK_CHROME = {
  frontColor: '#ffffff',
  backgroundColor: '#1E2126',
};

var DEPTH_CHROME = {
  frontColor: '#ffffff',
  backgroundColor: '#12293E',
};

var DEPTH_NIGHT_CHROME = {
  frontColor: '#ffffff',
  backgroundColor: '#131519',
};

function getPreference() {
  try {
    var v = platform.getStorage(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch (e) {}
  return 'system';
}

function setPreference(pref) {
  var next = pref === 'light' || pref === 'dark' ? pref : 'system';
  platform.setStorage(STORAGE_KEY, next);
  return next;
}

function systemIsDark() {
  try {
    var info = platform.getSystemInfo();
    if (info && info.theme) return info.theme === 'dark';
  } catch (e) {}
  return false;
}

function resolveEffective() {
  var pref = getPreference();
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemIsDark() ? 'dark' : 'light';
}

function resolveClass() {
  return resolveEffective() === 'dark' ? 'theme-dark' : 'theme-light';
}

function applyChrome(effective, depth) {
  var dark = effective === 'dark';
  var chrome = depth ? (dark ? DEPTH_NIGHT_CHROME : DEPTH_CHROME) : dark ? DARK_CHROME : LIGHT_CHROME;
  platform.setNavigationBar({
    frontColor: chrome.frontColor,
    backgroundColor: chrome.backgroundColor,
  });
}

function applyToPage(page, depth) {
  if (!page || typeof page.setData !== 'function') return;
  var cls = resolveClass();
  var patch = {};
  if (page.data.themeClass !== cls) patch.themeClass = cls;
  if (Object.keys(patch).length) page.setData(patch);
  applyChrome(resolveEffective(), !!depth);
}

function applyToComponent(comp) {
  if (!comp || typeof comp.setData !== 'function') return;
  var cls = resolveClass();
  if (comp.data.themeClass !== cls) comp.setData({ themeClass: cls });
}

function wrapPage(PageCtor) {
  return function (options) {
    options = options || {};
    var data = options.data || {};
    if (data.themeClass === undefined) data.themeClass = resolveClass();
    options.data = data;
    var depth = !!options.depthPage;
    var _onLoad = options.onLoad;
    options.onLoad = function () {
      applyToPage(this, depth);
      if (typeof _onLoad === 'function') _onLoad.apply(this, arguments);
    };
    var _onShow = options.onShow;
    options.onShow = function () {
      applyToPage(this, depth);
      if (typeof _onShow === 'function') _onShow.apply(this, arguments);
    };
    return PageCtor(options);
  };
}

function labelFor(pref) {
  if (pref === 'light') return '浅色';
  if (pref === 'dark') return '深色';
  return '跟随系统';
}

function iconTone() {
  return resolveEffective() === 'dark' ? 'night' : 'ink';
}

module.exports = {
  STORAGE_KEY: STORAGE_KEY,
  getPreference: getPreference,
  setPreference: setPreference,
  resolveEffective: resolveEffective,
  resolveClass: resolveClass,
  applyChrome: applyChrome,
  applyToPage: applyToPage,
  applyToComponent: applyToComponent,
  wrapPage: wrapPage,
  labelFor: labelFor,
  iconTone: iconTone,
};
