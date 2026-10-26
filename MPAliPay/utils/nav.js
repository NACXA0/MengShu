var platform = require('./platform');

function getNavLayout() {
  var sys = platform.getSystemInfo();
  var statusBarHeight = sys.statusBarHeight || 44;
  var titleBarHeight = sys.titleBarHeight || 48;
  var navBarHeight = titleBarHeight;
  var menuHeight = Math.max(32, Math.round(titleBarHeight * 0.7));
  var sidePad = 16;
  var menuTop = statusBarHeight + Math.max(0, (titleBarHeight - menuHeight) / 2);

  // 若运行时有胶囊矩形（部分基础库）
  try {
    if (typeof my !== 'undefined' && my.getMenuButtonBoundingClientRect) {
      var menu = my.getMenuButtonBoundingClientRect();
      if (menu && menu.height) {
        var gap = Math.max(0, (menu.top || statusBarHeight) - statusBarHeight);
        navBarHeight = gap * 2 + menu.height;
        menuHeight = menu.height;
        menuTop = menu.top || menuTop;
        var capsuleRightGap = Math.max(0, (sys.windowWidth || 0) - (menu.right || 0));
        sidePad = Math.max(16, Math.round(capsuleRightGap) || 16);
      }
    }
  } catch (e) {}

  return {
    statusBarHeight: statusBarHeight,
    navBarHeight: navBarHeight,
    menuHeight: menuHeight,
    menuTop: menuTop,
    sidePad: sidePad,
    contentPadTop: statusBarHeight + navBarHeight,
    backStyle:
      'top:' +
      menuTop +
      'px;left:' +
      sidePad +
      'px;width:' +
      menuHeight +
      'px;height:' +
      menuHeight +
      'px;',
    navPadStyle:
      'padding-top:' +
      statusBarHeight +
      'px;height:' +
      (statusBarHeight + navBarHeight) +
      'px;',
    bodyPadStyle: 'padding-top:' + (statusBarHeight + navBarHeight) + 'px;',
  };
}

function goBack(fallbackTab) {
  var pages = platform.getCurrentPagesSafe();
  if (pages.length > 1) {
    platform.navigateBack(1);
    return;
  }
  platform.switchTab(fallbackTab || '/pages/vault/vault');
}

function reduceMotion() {
  try {
    var info = platform.getSystemInfo();
    if (info && (info.reduceMotion === true || info.prefersReducedMotion === true)) return true;
  } catch (e) {}
  return false;
}

function delay(ms, fn) {
  if (reduceMotion()) {
    fn();
    return;
  }
  setTimeout(fn, ms);
}

module.exports = {
  getNavLayout: getNavLayout,
  goBack: goBack,
  reduceMotion: reduceMotion,
  delay: delay,
};
