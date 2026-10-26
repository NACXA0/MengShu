var theme = require('./utils/theme');
var cloud = require('./utils/cloud');

Page = theme.wrapPage(Page);

App({
  onLaunch: function () {
    cloud.init();
    theme.applyChrome(theme.resolveEffective(), false);
  },

  onError: function (msg) {
    try {
      console.error('[App.onError]', msg);
    } catch (e) {}
  },

  globalData: {
    brand: '盟书',
    pendingCode: '',
    certifyTicket: null,
    vaultSessionPass: '',
    lastAuthCode: null,
    session: null,
  },

  ensureSessionOrGate: function () {
    return !!(this.globalData && this.globalData.session && this.globalData.session.openId);
  },

  setSession: function (session) {
    this.globalData.session = session || null;
  },
});
