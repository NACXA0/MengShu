var platform = require('../../utils/platform');
var cloud = require('../../utils/cloud');
var shell = require('../../utils/shell');
var sign = require('../../utils/sign');
var haptics = require('../../utils/haptics');

Page({
  depthPage: true,
  data: {
    rel: null,
    view: null,
    role: 'A',
    message: '',
    awaitingCertify: false,
    peer: null,
    ritual: false,
    showSeal: false,
    sealDrop: false,
    digestShown: '',
    ritualDone: false,
  },

  onLoad: function (q) {
    this._id = (q && q.id) || '';
    this._playedRitual = false;
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
              ? '身份验证服务暂不可用，请稍后重试'
              : '身份验证未完成，双签未推进',
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
      that._list = list;
      var rel = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === that._id) rel = list[i];
      }
      var view = rel ? sign.viewForRole(rel, role) : null;
      var peer = null;
      if (rel) {
        var root = sign.commitmentRoot(list);
        if (rel.status === sign.STATUS.SIGNED && rel.anchor) {
          var drift = sign.anchorDrift(rel.anchor, list);
          peer = {
            count: rel.anchor.count || 0,
            rootShort: (rel.anchor.root || root).slice(0, 8),
            driftLabel: drift ? drift.label : '',
          };
        } else {
          peer = { count: list.length, rootShort: root.slice(0, 8), driftLabel: '' };
        }
      }
      that.setData({
        rel: rel,
        view: view,
        role: role,
        peer: peer,
      });
      if (view && view.status === 'SIGNED' && !that._playedRitual) {
        that.playRitual(view.digest || '');
      } else if (view && view.status === 'SIGNED' && that._playedRitual) {
        that.setData({
          ritual: true,
          showSeal: true,
          sealDrop: false,
          digestShown: view.digest || '',
          ritualDone: true,
        });
      }
    });
  },

  playRitual: function (digest) {
    var that = this;
    this._playedRitual = true;
    this.setData({
      ritual: true,
      showSeal: false,
      sealDrop: false,
      digestShown: '',
      ritualDone: false,
      message: '',
    });
    setTimeout(function () {
      that.setData({ showSeal: true, sealDrop: true });
      haptics.seal();
    }, 280);
    setTimeout(function () {
      that.typeDigest(digest || '');
    }, 700);
  },

  typeDigest: function (full) {
    var that = this;
    var i = 0;
    var step = function () {
      i += 1;
      that.setData({ digestShown: full.slice(0, i) });
      if (i < full.length) {
        setTimeout(step, 18);
      } else {
        that.setData({ ritualDone: true });
      }
    };
    if (!full) {
      this.setData({ ritualDone: true });
      return;
    }
    step();
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
    // 邀请方侧恒定「等待」——本方仅自见，不展示拒绝原因给邀请方
    this.setData({ message: '' });
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
          message: (certifyResult && certifyResult.message) || '身份验证未通过',
        });
        return;
      }
      var r = sign.markCertified(that.data.rel, side, certifyResult, { relations: that._list });
      if (!r.ok) {
        that.setData({ message: r.message || '无法确认' });
        return;
      }
      that.persistRel(r.relation).then(function () {
        if (r.sealed) {
          that.setData({ message: '' });
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
