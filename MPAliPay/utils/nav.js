var platform = require('./platform');

function getNavLayout() {
  var sys = platform.getSystemInfo();
  var windowWidth = sys.windowWidth || 375;
  var statusBarHeight = sys.statusBarHeight || 44;
  var titleBarHeight = sys.titleBarHeight || 48;
  var navBarHeight = titleBarHeight;
  var menuHeight = Math.max(32, Math.round(titleBarHeight * 0.7));
  var menuWidth = 87;
  var sidePad = 16;
  var menuTop = statusBarHeight + Math.max(0, (titleBarHeight - menuHeight) / 2);
  var menuLeft = windowWidth - sidePad - menuWidth;

  // 若运行时有胶囊矩形（部分基础库）
  try {
    if (typeof my !== 'undefined' && my.getMenuButtonBoundingClientRect) {
      var menu = my.getMenuButtonBoundingClientRect();
      if (menu && menu.height) {
        var gap = Math.max(0, (menu.top || statusBarHeight) - statusBarHeight);
        navBarHeight = gap * 2 + menu.height;
        menuHeight = menu.height;
        menuWidth = menu.width || menuWidth;
        menuTop = menu.top || menuTop;

        // 校验胶囊水平位置：部分 IDE/基础库返回的 left/right 会超出屏幕，此时回退到基于 windowWidth 计算
        var rectLeft = typeof menu.left === 'number' ? menu.left : -1;
        var rectRight = typeof menu.right === 'number' ? menu.right : -1;
        var rectLeftValid = rectLeft >= 0 && rectLeft + menuWidth <= windowWidth + 1;
        if (rectLeftValid) {
          menuLeft = rectLeft;
          sidePad = Math.max(16, Math.round(windowWidth - rectRight) || 16);
        }
      }
    }
  } catch (e) {}

  var menuBottom = menuTop + menuHeight;

  // 齿轮：胶囊左侧、与胶囊垂直居中、无背景
  var gearSize = Math.max(28, Math.round(menuHeight * 0.72));
  var gearTop = menuTop + (menuHeight - gearSize) / 2;
  var gearGap = 16;
  var gearLeft = Math.max(sidePad, menuLeft - gearSize - gearGap);
  var gearStyle =
    'top:' +
    gearTop +
    'px;left:' +
    gearLeft +
    'px;width:' +
    gearSize +
    'px;height:' +
    gearSize +
    'px;';

  // 胶囊左侧按钮组（设置 + 扫一扫）
  var btnGap = 12;
  var btnContainerWidth = gearSize * 2 + btnGap;
  var btnContainerLeft = Math.max(sidePad, menuLeft - btnContainerWidth - gearGap);
  // 二次保护：确保按钮组不会跑出屏幕右侧
  btnContainerLeft = Math.min(btnContainerLeft, windowWidth - btnContainerWidth - sidePad);
  var capsuleButtonsStyle =
    'top:' +
    gearTop +
    'px;left:' +
    btnContainerLeft +
    'px;width:' +
    btnContainerWidth +
    'px;height:' +
    gearSize +
    'px;';

  return {
    statusBarHeight: statusBarHeight,
    navBarHeight: navBarHeight,
    menuHeight: menuHeight,
    menuWidth: menuWidth,
    menuTop: menuTop,
    sidePad: sidePad,
    windowWidth: windowWidth,
    contentPadTop: statusBarHeight + navBarHeight,
    gearStyle: gearStyle,
    gearSize: gearSize,
    gearSizeRpx: Math.round((gearSize * 750) / (sys.windowWidth || 375)),
    capsuleButtonsStyle: capsuleButtonsStyle,
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
    /** 无自绘导航栏的页面（封面/首页）：让开胶囊即可，无需整条标题栏 */
    barePadStyle: 'padding-top:' + Math.ceil(menuBottom + 12) + 'px;',
  };
}

function goBack(fallbackTab) {
  var pages = platform.getCurrentPagesSafe();
  if (pages.length > 1) {
    platform.navigateBack(1);
    return;
  }
  platform.reLaunch(fallbackTab || '/pages/vault/vault');
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
