var nav = require('../../utils/nav');
var haptics = require('../../utils/haptics');
var theme = require('../../utils/theme');

Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    plaza: { type: Boolean, value: true },
    report: { type: Boolean, value: false },
    depth: { type: Boolean, value: false },
    scrolled: { type: Boolean, value: false },
  },
  data: {
    layout: {},
    tone: 'ink',
  },
  lifetimes: {
    attached: function () {
      this.setData({
        layout: nav.getNavLayout(),
        tone: this.data.depth ? 'night' : theme.iconTone(),
      });
    },
  },
  observers: {
    depth: function (d) {
      this.setData({ tone: d ? 'night' : theme.iconTone() });
    },
  },
  pageLifetimes: {
    show: function () {
      this.setData({ tone: this.data.depth ? 'night' : theme.iconTone() });
    },
  },
  methods: {
    onBack: function () {
      haptics.paper();
      this.triggerEvent('back');
      if (this.data.depth) return;
      nav.goBack();
    },
    onReport: function () {
      haptics.paper();
      this.triggerEvent('report');
    },
  },
});
