var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');

var REFUSE_KEY = 'mengshu_demo_refuse_bound';

Page({
  data: {
    adult: false,
    refuseExisting: false,
    message: '',
    busy: false,
  },

  onLoad: function () {
    this.setData({ refuseExisting: !!platform.getStorage(REFUSE_KEY) });
    if (getApp().ensureSessionOrGate()) {
      platform.reLaunch('/pages/vault/vault');
    }
  },

  onShow: function () {
    if (getApp().ensureSessionOrGate()) {
      platform.reLaunch('/pages/vault/vault');
    }
  },

  toggleAdult: function () {
    this.setData({ adult: !this.data.adult, message: '' });
  },

  enter: function () {
    if (this.data.busy) return;
    if (!this.data.adult) {
      this.setData({ message: '须先声明已满 18 周岁' });
      return;
    }
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
        platform.reLaunch('/pages/vault/vault');
      })
      .catch(function (e) {
        that.setData({ busy: false, message: (e && e.message) || '进入失败' });
      });
  },
});
