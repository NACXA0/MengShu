var nav = require('../../utils/nav');
var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    adult: false,
    refuseExisting: false,
    message: '',
    busy: false,
    note: '身份由云函数 OPENID 绑定。未配置云环境时走本地同逻辑兜底。',
  },

  onLoad: function () {
    if (getApp().ensureSessionOrGate()) {
      platform.switchTab('/pages/vault/vault');
      return;
    }
    this.setData({ layout: nav.getNavLayout() });
  },

  onShow: function () {
    if (getApp().ensureSessionOrGate()) {
      platform.switchTab('/pages/vault/vault');
    }
  },

  toggleAdult: function () {
    this.setData({ adult: !this.data.adult, message: '' });
  },

  toggleRefuse: function () {
    this.setData({ refuseExisting: !this.data.refuseExisting, message: '' });
  },

  enter: function () {
    if (this.data.busy) return;
    haptics.paper();
    var that = this;
    this.setData({ busy: true, message: '' });

    platform.tryGetAuthCode(function (authCode) {
      if (authCode) {
        try {
          getApp().globalData.lastAuthCode = authCode;
        } catch (e) {}
      }
      that.finishEnter();
    });
  },

  finishEnter: function () {
    var that = this;
    cloud
      .call('authEnter', {
        adultDeclared: this.data.adult,
        refuseExisting: this.data.refuseExisting,
      })
      .then(function (result) {
        that.setData({ busy: false });
        if (!result || !result.ok) {
          that.setData({ message: (result && result.message) || '无法进入' });
          return;
        }
        getApp().setSession(result.session);
        platform.switchTab('/pages/vault/vault');
      })
      .catch(function (e) {
        that.setData({ busy: false, message: (e && e.message) || '进入失败' });
      });
  },
});
