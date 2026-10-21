var nav = require('../../utils/nav');
var store = require('../../utils/store');
var haptics = require('../../utils/haptics');

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
    var profile = store.getProfile((q && q.id) || 'pb_lin');
    this.setData({
      layout: nav.getNavLayout(),
      profile: profile,
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
    wx.setClipboardData({ data: map[key] || '' });
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
