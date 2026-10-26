var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');
var platform = require('../../utils/platform');

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
    var that = this;
    var fields = ((q && q.fields) || 'band,attestation').split(',').filter(Boolean);
    this.setData({ layout: nav.getNavLayout(), kind: kind });

    var finish = function (profile) {
      var rows = [];
      if (kind === 'pass' && profile) {
        if (fields.indexOf('band') >= 0) rows.push({ label: '存证关系数', value: profile.band });
        if (fields.indexOf('attestation') >= 0)
          rows.push({ label: '宣誓状态', value: profile.attestationLabel });
        if (fields.indexOf('statements') >= 0)
          rows.push({
            label: '陈述',
            value: (profile.statements || []).length ? '已公示' : '未提交',
          });
      }
      if (kind === 'grant') {
        var keys = ((q && q.granted) || '').split(',').filter(Boolean);
        var labels = {
          band: '存证关系数区间',
          attestation: '完整性宣誓状态',
          statements: '公示陈述精选',
        };
        keys.forEach(function (k) {
          rows.push({ label: labels[k] || k, value: '已授权' });
        });
      }
      that.setData({
        gold: !!(profile && profile.anchored && kind === 'pass'),
        rows: rows,
        until: kind === 'grant' ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : '',
      });
      if (kind === 'pass') {
        if (nav.reduceMotion()) {
          that.setData({ drop: true });
          haptics.seal();
        } else {
          setTimeout(function () {
            that.setData({ drop: true });
            haptics.seal();
          }, 40);
        }
      }
    };

    if (kind === 'pass' || kind === 'grant') {
      cloud.call('plazaGet', { id: (q && q.profileId) || 'pb_lin' }).then(function (res) {
        finish((res && res.profile) || null);
      });
    } else {
      finish(null);
    }
  },

  retry: function () {
    platform.switchTab('/pages/verify/verify');
  },

  toLedger: function () {
    platform.switchTab('/pages/me/me');
  },
});
