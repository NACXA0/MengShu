var nav = require('../../utils/nav');
var store = require('../../utils/store');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    scrolled: false,
    hint: false,
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
    if (this.getTabBar) this.getTabBar().setSelected(0);
    var app = getApp();
    var pending = app.globalData && app.globalData.pendingCode;
    var patch = {
      hint: !store.hintSeen(),
      logs: store.getLogs(),
    };
    if (pending) {
      patch.code = String(pending).toUpperCase();
      app.globalData.pendingCode = '';
    }
    this.setData(patch);
  },


  onPageScroll: function (e) {
    this.setData({ scrolled: (e.scrollTop || 0) > 8 });
  },

  onScan: function () {
    haptics.paper();
    var that = this;
    wx.scanCode({
      onlyFromCamera: false,
      success: function (res) {
        that.setData({ code: String(res.result || '').trim() });
        that.submit();
      },
    });
  },

  onInput: function (e) {
    this.setData({ code: e.detail.value || '' });
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
    wx.navigateTo({
      url: '/pages/result/result?kind=' + (row.expired ? 'expired' : 'pass') + '&code=' + encodeURIComponent(row.code) + '&profileId=' + (row.profileId || ''),
    });
  },

  submit: function () {
    store.markHintSeen();
    this.setData({ hint: false });
    var raw = this.data.code;
    var r = store.redeemCode(raw);
    if (r.reason === 'format') {
      this.setData({ shake: true });
      var that = this;
      setTimeout(function () {
        that.setData({ shake: false });
      }, 200);
      return;
    }
    this.setData({ logs: store.getLogs() });
    if (!r.ok) {
      wx.navigateTo({ url: '/pages/result/result?kind=expired' });
      return;
    }
    wx.navigateTo({
      url:
        '/pages/result/result?kind=pass&profileId=' +
        r.profile.id +
        '&fields=' +
        encodeURIComponent((r.fields || []).join(',')) +
        '&code=' +
        encodeURIComponent(r.code),
    });
  },
});
