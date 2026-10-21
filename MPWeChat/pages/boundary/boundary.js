var nav = require('../../utils/nav');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    layout: {},
    phase: 'enter',
    nudge: false,
  },

  onLoad: function () {
    this.setData({
      layout: nav.getNavLayout(),
      phase: nav.reduceMotion() ? 'in' : 'enter',
    });
    var that = this;
    nav.delay(16, function () {
      that.setData({ phase: 'in' });
    });
  },

  onBack: function () {
    var that = this;
    if (nav.reduceMotion()) {
      nav.goBack();
      return;
    }
    this.setData({ phase: 'leave' });
    setTimeout(function () {
      nav.goBack();
    }, 400);
  },

  push: function () {
    if (nav.reduceMotion()) {
      haptics.door();
      return;
    }
    this.setData({ nudge: true });
    haptics.door();
    var that = this;
    setTimeout(function () {
      that.setData({ nudge: false });
    }, 120);
  },
});
