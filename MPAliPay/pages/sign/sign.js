var nav = require('../../utils/nav');
var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var shell = require('../../utils/shell');
var sign = require('../../utils/sign');
var haptics = require('../../utils/haptics');

Page({
  data: {
    layout: {},
    rel: null,
    view: null,
    role: 'A',
    message: '',
    awaitingCertify: false,
  },

  onLoad: function (q) {
    this._id = (q && q.id) || '';
    this.setData({ layout: nav.getNavLayout() });
    this.refresh();
  },

  onShow: function () {
    var ticket = shell.takePendingCertify();
    try {
      var g = getApp().globalData.certifyTicket;
      if (!ticket && g) ticket = g;
      getApp().globalData.certifyTicket = null;
    } catch (e) {}

    if (ticket && this.data.awaitingCertify) {
      this.setData({ awaitingCertify: false });
      if (ticket.ok && ticket.action === 'sign') {
        this.applyCertify(ticket.side || this.data.role);
      } else if (!ticket.ok) {
        this.setData({
          message:
            ticket.reason === 'service_down'
              ? '身份核验服务暂不可用，请稍后重试'
              : '核验未完成，双签未推进',
        });
      }
    }
    this.refresh();
  },

  refresh: function () {
    var that = this;
    var role = shell.getSignRole();
    cloud.call('relationList', {}).then(function (res) {
      var list = (res && res.relations) || [];
      var rel = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === that._id) rel = list[i];
      }
      that.setData({
        rel: rel,
        view: rel ? sign.viewForRole(rel, role) : null,
        role: role,
      });
    });
  },

  persistRel: function (rel) {
    var that = this;
    return cloud.call('relationSave', { relation: rel }).then(function (res) {
      if (!res || !res.ok) {
        that.setData({ message: (res && res.message) || '保存失败' });
        return null;
      }
      that.refresh();
      return res.relation;
    });
  },

  accept: function () {
    haptics.paper();
    var r = sign.acceptInvite(this.data.rel);
    if (!r.ok) {
      this.setData({ message: r.message || '无法接受' });
      return;
    }
    this.persistRel(r.relation);
  },

  decline: function () {
    haptics.paper();
    var r = sign.declineInvite(this.data.rel);
    if (!r.ok) return;
    this.persistRel(r.relation);
    this.setData({ message: '已拒绝（邀请方仍见等待）' });
  },

  goCertify: function () {
    haptics.paper();
    if (!this.data.rel || this.data.rel.status !== sign.STATUS.DRAFTING) {
      this.setData({ message: '须先进入起草' });
      return;
    }
    this.setData({ awaitingCertify: true, message: '' });
    platform.navigateTo(
      '/pages/certify/certify?action=sign&side=' + encodeURIComponent(this.data.role)
    );
  },

  applyCertify: function (side) {
    var that = this;
    cloud.call('certifyCheck', { action: 'sign' }).then(function (certifyResult) {
      if (!certifyResult || !certifyResult.ok) {
        that.setData({
          message: (certifyResult && certifyResult.message) || '核验未通过',
        });
        return;
      }
      var r = sign.markCertified(that.data.rel, side, certifyResult);
      if (!r.ok) {
        that.setData({ message: r.message || '无法确认' });
        return;
      }
      that.persistRel(r.relation).then(function () {
        if (r.sealed) {
          that.setData({ message: '双方已确认 · ' + (r.relation.anchoredLabel || '') });
        } else {
          that.setData({ message: '本方已确认，等待另一方' });
        }
      });
    });
  },

  switchRole: function () {
    haptics.paper();
    var next = this.data.role === 'A' ? 'B' : 'A';
    shell.setSignRole(next);
    this.refresh();
  },
});
