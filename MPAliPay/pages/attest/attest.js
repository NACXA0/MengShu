var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');
var platform = require('../../utils/platform');

Page({
  data: {
    layout: {},
    profile: null,
    copied: '',
    checked: '',
    mismatch: false,
    drop: false,
  },

  onLoad: function (q) {
    var that = this;
    this.setData({ layout: nav.getNavLayout() });
    cloud.call('plazaGet', { id: (q && q.id) || 'pb_lin' }).then(function (res) {
      that.setData({ profile: (res && res.profile) || null });
    });
  },

  copy: function (e) {
    var key = e.currentTarget.dataset.key;
    var p = this.data.profile || {};
    var map = {
      digest: p.digest,
      txId: p.txId,
      anchoredAt: p.anchoredAt,
      merkle: (p.merkle || []).join('\n'),
    };
    platform.setClipboard(map[key] || '');
    this.setData({ copied: key });
    var that = this;
    setTimeout(function () {
      that.setData({ copied: '' });
    }, 1500);
  },

  check: function () {
    var p = this.data.profile;
    if (!p) return;
    if (p.proofOk) {
      this.setData({ checked: 'ok', drop: true, mismatch: false });
      haptics.seal();
    } else {
      this.setData({ checked: 'bad', mismatch: true, drop: false });
    }
  },
});
