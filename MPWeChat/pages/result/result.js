var nav = require('../../utils/nav');
var store = require('../../utils/store');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    kind: 'pass',
    drop: false,
    rows: [],
    gold: false,
    until: '',
  },

  onLoad: function (q) {
    var kind = (q && q.kind) || 'pass';
    var profile = store.getProfile((q && q.profileId) || 'pb_lin');
    var fields = ((q && q.fields) || 'band,attestation').split(',').filter(Boolean);
    var rows = [];
    if (kind === 'pass' && profile) {
      if (fields.indexOf('band') >= 0) rows.push({ label: '存证关系数', value: profile.band });
      if (fields.indexOf('attestation') >= 0) rows.push({ label: '宣誓状态', value: profile.attestationLabel });
      if (fields.indexOf('statements') >= 0) rows.push({ label: '陈述', value: (profile.statements || []).length ? '已公示' : '未提交' });
    }
    if (kind === 'grant') {
      var keys = ((q && q.granted) || '').split(',').filter(Boolean);
      var labels = { band: '存证关系数区间', attestation: '完整性宣誓状态', statements: '公示陈述精选' };
      keys.forEach(function (k) {
        rows.push({ label: labels[k] || k, value: '已授权' });
      });
    }
    this.setData({
      layout: nav.getNavLayout(),
      kind: kind,
      gold: !!(profile && profile.anchored && kind === 'pass'),
      rows: rows,
      until: kind === 'grant' ? store.validUntil() : '',
    });
    if (kind === 'pass') {
      var that = this;
      if (nav.reduceMotion()) {
        this.setData({ drop: true });
        haptics.seal();
      } else {
        setTimeout(function () {
          that.setData({ drop: true });
          haptics.seal();
        }, 40);
      }
    }
  },

  retry: function () {
    wx.switchTab({ url: '/pages/verify/verify' });
  },

  toLedger: function () {
    wx.switchTab({ url: '/pages/me/me' });
  },
});
