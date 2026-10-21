var nav = require('../../utils/nav');
var store = require('../../utils/store');
var theme = require('../../utils/theme');

Page({
  data: {
    layout: {},
    appearance: '跟随系统',
    consents: [],
    resetLabel: '重置种子',
    resetArmed: false,
    samples: [
      { id: 'pb_lin', title: '林晚', sub: '演示样本，正式产品只能靠链接到达' },
      { id: 'pb_zhou', title: '周南', sub: '未宣誓 · 双方均未提交陈述' },
      { id: 'pb_one', title: '陈启', sub: '仅一方陈述' },
      { id: 'pb_false', title: '吴昭', sub: '虚假宣誓记录' },
      { id: 'pb_off', title: '沈予', sub: '公示已撤下' },
    ],
    codes: [
      { id: 'MS-VALID', title: 'MS-VALID', sub: '有效一次' },
      { id: 'MS-EXPIRED', title: 'MS-EXPIRED', sub: '已过期' },
    ],
    orgs: [
      { id: 'org_seed', title: '临川婚介', sub: '六要素齐全' },
      { id: 'org_broken', title: '未具名机构', sub: '缺联系方式' },
    ],
  },

  onLoad: function () {
    this.setData({ layout: nav.getNavLayout() });
  },

  onShow: function () {
    if (this.getTabBar) this.getTabBar().setSelected(1);
    this.setData({
      appearance: theme.labelFor(theme.getPreference()),
      consents: store.getConsents(),
    });
  },


  openPlaza: function (e) {
    if (this.getTabBar) this.getTabBar().conceal(false);
    wx.navigateTo({ url: '/pages/plaza/plaza?id=' + e.currentTarget.dataset.id });
  },

  fillCode: function (e) {
    getApp().globalData.pendingCode = e.currentTarget.dataset.id;
    wx.switchTab({ url: '/pages/verify/verify' });
  },

  openOrg: function (e) {
    if (this.getTabBar) this.getTabBar().conceal(true);
    wx.navigateTo({ url: '/pages/consent/consent?org=' + e.currentTarget.dataset.id });
  },

  openBoundary: function () {
    if (this.getTabBar) this.getTabBar().conceal(true);
    wx.navigateTo({ url: '/pages/boundary/boundary' });
  },

  cycleTheme: function () {
    var cur = theme.getPreference();
    var next = cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
    theme.setPreference(next);
    theme.applyToPage(this, false);
    this.setData({ appearance: theme.labelFor(next) });
    if (this.getTabBar) this.getTabBar().setData({ tone: theme.iconTone(), themeClass: theme.resolveClass() });
  },

  reset: function () {
    if (!this.data.resetArmed) {
      this.setData({ resetArmed: true, resetLabel: '再次点击以重置' });
      var that = this;
      setTimeout(function () {
        that.setData({ resetArmed: false, resetLabel: '重置种子' });
      }, 2500);
      return;
    }
    store.reset();
    this.setData({
      resetArmed: false,
      resetLabel: '重置种子',
      consents: [],
    });
  },
});
