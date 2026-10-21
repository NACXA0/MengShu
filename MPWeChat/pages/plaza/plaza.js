var nav = require('../../utils/nav');
var store = require('../../utils/store');

Page({
  data: {
    layout: {},
    profile: null,
    rows: [],
    sealKind: 'meng',
    pending: false,
  },

  onLoad: function (q) {
    var id = (q && q.id) || 'pb_lin';
    var profile = store.getProfile(id);
    var rows = [];
    if (profile && !profile.withdrawn) {
      rows = [
        { label: '关系数', value: profile.band },
        { label: '关闭方式', value: profile.closure },
        {
          label: '宣誓',
          value: profile.attestationLabel,
          alert: profile.attestation === 'false',
        },
        { label: '注册', value: profile.registered },
      ];
    }
    var sealKind = 'meng';
    if (profile && profile.attestation === 'false') sealKind = 'zhengwei';
    this.setData({
      layout: nav.getNavLayout(),
      profile: profile,
      rows: rows,
      sealKind: sealKind,
      pending: !!(profile && !profile.anchored && !profile.withdrawn),
    });
  },

  onSeal: function () {
    var p = this.data.profile;
    if (!p || p.withdrawn) return;
    wx.navigateTo({ url: '/pages/attest/attest?id=' + p.id });
  },

  onReport: function () {
    var p = this.data.profile;
    wx.navigateTo({ url: '/pages/report/report?id=' + (p ? p.id : '') });
  },

  onCopy: function () {
    var p = this.data.profile;
    wx.setClipboardData({ data: p ? p.publicId : '' });
  },

  onShare: function () {},

  onShareAppMessage: function () {
    var p = this.data.profile;
    return {
      title: '盟书公开页',
      path: '/pages/plaza/plaza?id=' + (p ? p.id : 'pb_lin'),
    };
  },
});
