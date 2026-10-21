var theme = require('../utils/theme');
var haptics = require('../utils/haptics');

var TABS = [
  { key: 'verify', label: '核验', path: '/pages/verify/verify', icon: 'shield' },
  { key: 'me', label: '我的', path: '/pages/me/me', icon: 'window' },
];

Component({
  data: {
    themeClass: '',
    selected: 0,
    hidden: false,
    tone: 'ink',
    tabs: TABS,
  },
  lifetimes: {
    attached: function () {
      theme.applyToComponent(this);
      this.setData({ tone: theme.iconTone() });
    },
  },
  pageLifetimes: {
    show: function () {
      theme.applyToComponent(this);
      this.setData({ hidden: false, tone: theme.iconTone() });
    },
  },
  methods: {
    setSelected: function (index) {
      this.setData({ selected: Number(index) || 0, hidden: false });
    },
    conceal: function (heavy) {
      this.setData({ hidden: true, hideHeavy: !!heavy });
    },
    reveal: function () {
      this.setData({ hidden: false });
    },
    onTap: function (e) {
      var index = Number(e.currentTarget.dataset.index);
      var tab = TABS[index];
      if (!tab) return;
      haptics.paper();
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({ url: tab.path });
    },
  },
});
