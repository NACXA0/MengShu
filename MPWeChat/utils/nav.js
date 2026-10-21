function getNavLayout() {
  var sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  var menu = wx.getMenuButtonBoundingClientRect();
  var statusBarHeight = sys.statusBarHeight || 20;
  var gap = Math.max(0, (menu.top || statusBarHeight) - statusBarHeight);
  var navBarHeight = gap * 2 + (menu.height || 32);
  var menuHeight = Math.max(32, menu.height || 32);
  var capsuleRightGap = Math.max(0, (sys.windowWidth || 0) - (menu.right || 0));
  var sidePad = Math.max(16, Math.round(capsuleRightGap) || 16);
  var rightSafe = (sys.windowWidth || 0) - (menu.left || 0) + 8;
  return {
    statusBarHeight: statusBarHeight,
    navBarHeight: navBarHeight,
    menuHeight: menuHeight,
    menuTop: menu.top || statusBarHeight + gap,
    sidePad: sidePad,
    rightSafe: rightSafe,
    contentPadTop: statusBarHeight + navBarHeight,
    backStyle:
      'top:' +
      (menu.top || statusBarHeight + gap) +
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
  var pages = getCurrentPages() || [];
  if (pages.length > 1) {
    wx.navigateBack({ delta: 1 });
    return;
  }
  wx.switchTab({ url: fallbackTab || '/pages/verify/verify' });
}

function reduceMotion() {
  try {
    var info = wx.getSystemInfoSync();
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
