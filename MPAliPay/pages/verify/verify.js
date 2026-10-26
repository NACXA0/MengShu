var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');
var platform = require('../../utils/platform');

Page({
  data: {
    layout: {},
    scrolled: false,
    hint: true,
    code: '',
    focus: false,
    shake: false,
    logs: [],
  },

  onLoad: function (q) {
    this.setData({ layout: nav.getNavLayout() });
    var incoming = (q && (q.code || q.scene)) || '';
    if (incoming) {
      this.setData({ code: String(incoming).toUpperCase() });
      this.submit();
    }
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setSelected(1);
    }
    var app = getApp();
    var pending = app.globalData && app.globalData.pendingCode;
    var patch = {};
    if (pending) {
      patch.code = String(pending).toUpperCase();
      app.globalData.pendingCode = '';
    }
    var that = this;
    cloud.call('verifyLogs', {}).then(function (res) {
      patch.logs = (res && res.logs) || [];
      that.setData(patch);
    });
    if (Object.keys(patch).length && !patch.logs) this.setData(patch);
  },

  onPageScroll: function (e) {
    this.setData({ scrolled: (e.scrollTop || 0) > 8 });
  },

  onScan: function () {
    haptics.paper();
    var that = this;
    platform.scanCode(function (code) {
      if (code) {
        that.setData({ code: String(code).trim() });
        that.submit();
      }
    });
  },

  onInput: function (e) {
    this.setData({ code: (e.detail && e.detail.value) || '' });
  },

  onFocus: function () {
    this.setData({ focus: true });
  },

  onBlur: function () {
    this.setData({ focus: false });
  },

  onConfirm: function () {
    this.submit();
  },

  onLog: function (e) {
    var id = e.currentTarget.dataset.id;
    var logs = this.data.logs || [];
    var row = null;
    for (var i = 0; i < logs.length; i++) {
      if (logs[i].id === id) row = logs[i];
    }
    if (!row) return;
    platform.navigateTo(
      '/pages/result/result?kind=' +
        (row.expired ? 'expired' : 'pass') +
        '&code=' +
        encodeURIComponent(row.code) +
        '&profileId=' +
        (row.profileId || '')
    );
  },

  submit: function () {
    this.setData({ hint: false });
    var that = this;
    cloud.call('verifyRedeem', { code: this.data.code }).then(function (r) {
      if (r.reason === 'format') {
        that.setData({ shake: true });
        setTimeout(function () {
          that.setData({ shake: false });
        }, 200);
        return;
      }
      cloud.call('verifyLogs', {}).then(function (res) {
        that.setData({ logs: (res && res.logs) || [] });
      });
      if (!r.ok) {
        platform.navigateTo('/pages/result/result?kind=expired');
        return;
      }
      platform.navigateTo(
        '/pages/result/result?kind=pass&profileId=' +
          r.profile.id +
          '&fields=' +
          encodeURIComponent((r.fields || []).join(',')) +
          '&code=' +
          encodeURIComponent(r.code)
      );
    });
  },
});
