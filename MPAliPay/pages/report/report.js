var nav = require('../../utils/nav');
var cloud = require('../../utils/cloud');
var haptics = require('../../utils/haptics');

var REASONS = ['陈述不实', '含有他人身份信息', '冒用公开页', '其他'];

Page({
  data: {
    layout: {},
    reasons: REASONS,
    picked: -1,
    done: false,
    drop: false,
    profileId: '',
  },

  onLoad: function (q) {
    this.setData({
      layout: nav.getNavLayout(),
      profileId: (q && q.id) || '',
    });
  },

  pick: function (e) {
    if (this.data.done) return;
    this.setData({ picked: Number(e.currentTarget.dataset.index) });
  },

  submit: function () {
    if (this.data.picked < 0 || this.data.done) return;
    var that = this;
    cloud
      .call('reportAdd', {
        profileId: this.data.profileId,
        reason: REASONS[this.data.picked],
      })
      .then(function () {
        that.setData({ done: true, drop: true });
        haptics.seal();
      });
  },
});
