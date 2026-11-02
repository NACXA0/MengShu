var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var vaultLib = require('../../utils/vault');
var vaultSession = require('../../utils/vaultSession');
var sign = require('../../utils/sign');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    title: '',
    natures: ['认真恋爱', '订婚', '婚姻'],
    natureIndex: 0,
    nature: '认真恋爱',
    start: '',
    busy: false,
    message: '',
  },

  onLoad: function () {},

  onTitle: function (e) {
    this.setData({ title: (e.detail && e.detail.value) || '', message: '' });
  },

  onNature: function (e) {
    var idx = e.detail && e.detail.value;
    var nature = this.data.natures[idx];
    if (!nature) return;
    this.setData({ natureIndex: idx, nature: nature });
  },

  onStart: function (e) {
    this.setData({ start: (e.detail && e.detail.value) || '' });
  },

  submit: function () {
    if (this.data.busy) return;
    var title = this.data.title.trim();
    if (!title) {
      this.setData({ message: '请填写关系称呼' });
      return;
    }
    var start = this.data.start.trim();
    if (start && !/^\d{4}-\d{2}$/.test(start)) {
      this.setData({ message: '开始月份格式如 2026-11' });
      return;
    }
    if (!vaultLib.isUnlocked(vaultSession.loadUnlocked())) {
      this.setData({ message: '请先在档案页解锁保险库' });
      return;
    }
    haptics.paper();
    var that = this;
    this.setData({ busy: true, message: '' });
    var rel = sign.createInvite({
      title: title,
      nature: this.data.nature,
      period: { start: start || fmtMonth(), end: '' },
    });
    cloud.call('relationSave', { relation: rel }).then(function (res) {
      if (!res || !res.ok) {
        that.setData({ busy: false, message: (res && res.message) || '保存失败' });
        return;
      }
      platform.redirectTo('/pages/sign/sign?id=' + rel.id);
    });
  },
});

function fmtMonth() {
  var d = new Date();
  var m = d.getMonth() + 1;
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m);
}
