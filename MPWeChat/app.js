var theme = require('./utils/theme');
var store = require('./utils/store');

Page = theme.wrapPage(Page);

App({
  onLaunch: function () {
    store.load();
    theme.applyChrome(theme.resolveEffective(), false);
    try {
      if (typeof wx.onThemeChange === 'function') {
        wx.onThemeChange(function () {
          if (theme.getPreference() !== 'system') return;
          theme.applyChrome(theme.resolveEffective(), false);
        });
      }
    } catch (e) {}
  },

  onError: function (msg) {
    try {
      console.error('[App.onError]', msg);
    } catch (e) {}
  },

  globalData: {
    brand: '盟书',
    pendingCode: '',
  },
});
