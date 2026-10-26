var nav = require('../../utils/nav');
var platform = require('../../utils/platform');
var shell = require('../../utils/shell');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');

var ACTION_LABEL = {
  sign: '双签确认',
  consent: '现场授权',
  logout: '注销账号',
};

Page({
  depthPage: true,
  data: {
    layout: {},
    action: 'sign',
    actionLabel: '双签确认',
    side: '',
    message: '',
    down: false,
  },

  onLoad: function (q) {
    var action = (q && q.action) || 'sign';
    var that = this;
    this.setData({
      layout: nav.getNavLayout(),
      action: action,
      actionLabel: ACTION_LABEL[action] || action,
      side: (q && q.side) || '',
    });
    cloud.call('certifyCheck', { action: action }).then(function (r) {
      if (r && r.reason === 'service_down') {
        that.setData({ down: true, message: r.message });
      }
    });
  },

  onBack: function () {
    this.finish(false, 'cancelled');
  },

  confirm: function () {
    haptics.paper();
    var that = this;
    cloud.call('certifyCheck', { action: this.data.action }).then(function (result) {
      if (!result || !result.ok) {
        that.setData({
          message: (result && result.message) || '核验未通过',
          down: result && result.reason === 'service_down',
        });
        return;
      }
      that.finish(true, 'ok');
    });
  },

  cancel: function () {
    haptics.paper();
    this.finish(false, 'cancelled');
  },

  finish: function (ok, reason) {
    var ticket = {
      ok: !!ok,
      reason: reason,
      action: this.data.action,
      side: this.data.side,
      ts: Date.now(),
    };
    shell.setPendingCertify(ticket);
    try {
      getApp().globalData.certifyTicket = ticket;
    } catch (e) {}
    platform.navigateBack(1);
  },
});
