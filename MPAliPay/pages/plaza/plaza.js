var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var platform = require('../../utils/platform');

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
    var that = this;
    this.setData({ layout: nav.getNavLayout() });
    cloud.call('plazaGet', { id: id }).then(function (res) {
      var profile = (res && res.profile) || null;
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
      that.setData({
        profile: profile,
        rows: rows,
        sealKind: sealKind,
        pending: !!(profile && !profile.anchored && !profile.withdrawn),
      });
    });
  },

  onSeal: function () {
    var p = this.data.profile;
    if (!p || p.withdrawn) return;
    platform.navigateTo('/pages/attest/attest?id=' + p.id);
  },

  onReport: function () {
    var p = this.data.profile;
    platform.navigateTo('/pages/report/report?id=' + (p ? p.id : ''));
  },

  onCopy: function () {
    var p = this.data.profile;
    platform.setClipboard(p ? p.publicId : '');
  },
});
