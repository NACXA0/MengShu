var cloud = require('../../utils/cloud');
var platform = require('../../utils/platform');
var shell = require('../../utils/shell');
var haptics = require('../../utils/haptics');

Page({
  data: {
    mine: false,
    profile: null,
    rows: [],
    sealKind: 'meng',
    pending: false,
    message: '',
    busy: false,
  },

  onLoad: function (q) {
    this._id = (q && q.id) || 'pb_lin';
    this.setData({ mine: this._id === 'me' });
    this.refresh();
  },

  onShow: function () {
    var ticket = shell.takePendingCertify();
    try {
      var g = getApp().globalData.certifyTicket;
      if (!ticket && g) ticket = g;
      getApp().globalData.certifyTicket = null;
    } catch (e) {}

    if (ticket && this._awaitingPlaza) {
      this._awaitingPlaza = false;
      if (ticket.ok && ticket.action === 'plaza') {
        this.openPlaza();
      } else {
        this.setData({
          message:
            ticket.reason === 'service_down'
              ? '身份验证服务暂不可用，请稍后重试'
              : '未完成身份验证，公示未开启',
        });
      }
      return;
    }
    this.refresh();
  },

  refresh: function () {
    var that = this;
    cloud.call('plazaGet', { id: this._id }).then(function (res) {
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

  startOpen: function () {
    if (this.data.busy) return;
    haptics.paper();
    this._awaitingPlaza = true;
    this.setData({ message: '' });
    platform.navigateTo('/pages/certify/certify?action=plaza');
  },

  openPlaza: function () {
    var that = this;
    if (this.data.busy) return;
    this.setData({ busy: true, message: '' });
    cloud.call('plazaSet', { action: 'open' }).then(function (res) {
      that.setData({ busy: false });
      if (!res || !res.ok) {
        that.setData({ message: (res && res.message) || '开启失败' });
        return;
      }
      platform.showToast('公示已挂出');
      that.refresh();
    });
  },

  withdraw: function () {
    if (this.data.busy) return;
    haptics.paper();
    var that = this;
    platform.confirm(
      {
        title: '撤下公示',
        content: '撤下后公开页立即下线，可随时重新挂出（须身份验证）。',
        confirmButtonText: '撤下',
        cancelButtonText: '取消',
      },
      function (ok) {
        if (!ok) return;
        cloud.call('plazaSet', { action: 'withdraw' }).then(function (res) {
          if (!res || !res.ok) {
            that.setData({ message: (res && res.message) || '撤下失败' });
            return;
          }
          platform.showToast('公示已撤下');
          that.refresh();
        });
      }
    );
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
    platform.showToast('已复制链接标识');
  },
});
