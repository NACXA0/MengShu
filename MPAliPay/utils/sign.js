/**
 * 同机双签状态机（本地模拟）。
 * INVITED → DRAFTING → SIGNED（→ 写入模拟存证编号）
 * 拒绝/放弃：邀请方仍只见「等待对方响应」
 */
var identity = require('./identity');

var STATUS = {
  INVITED: 'INVITED',
  DRAFTING: 'DRAFTING',
  SIGNED: 'SIGNED',
  VOIDED: 'VOIDED',
};

function createInvite(opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  return {
    id: 'rel_' + now,
    status: STATUS.INVITED,
    title: opts.title || '一段关系',
    period: opts.period || { start: '2026-01', end: '' },
    nature: opts.nature || '认真恋爱',
    inviterSide: 'A',
    /** 对方视角下的真实状态；邀请方对 VOIDED 仍显示等待 */
    inviteeView: STATUS.INVITED,
    certified: { A: false, B: false },
    digest: '',
    txId: '',
    anchoredLabel: '',
    createdAt: now,
    updatedAt: now,
  };
}

function acceptInvite(rel, opts) {
  opts = opts || {};
  if (!rel || rel.status !== STATUS.INVITED) {
    return { ok: false, reason: 'state', message: '当前不可接受' };
  }
  rel.status = STATUS.DRAFTING;
  rel.inviteeView = STATUS.DRAFTING;
  rel.updatedAt = opts.now || Date.now();
  return { ok: true, relation: rel };
}

/**
 * 对方拒绝。邀请方界面仍显示等待（status 保持 INVITED，inviteeView=VOIDED）。
 */
function declineInvite(rel, opts) {
  opts = opts || {};
  if (!rel || rel.status !== STATUS.INVITED) {
    return { ok: false, reason: 'state' };
  }
  rel.inviteeView = STATUS.VOIDED;
  rel.updatedAt = opts.now || Date.now();
  return { ok: true, relation: rel, inviterSees: '等待对方响应' };
}

function viewForRole(rel, role) {
  if (!rel) return null;
  if (role === 'A' || role === 'inviter') {
    if (rel.inviteeView === STATUS.VOIDED && rel.status === STATUS.INVITED) {
      return Object.assign({}, rel, { displayStatus: 'WAITING', displayLabel: '等待对方响应' });
    }
    return Object.assign({}, rel, {
      displayStatus: rel.status,
      displayLabel: labelFor(rel.status),
    });
  }
  return Object.assign({}, rel, {
    displayStatus: rel.inviteeView || rel.status,
    displayLabel: labelFor(rel.inviteeView || rel.status),
  });
}

function labelFor(status) {
  if (status === STATUS.INVITED) return '待接受';
  if (status === STATUS.DRAFTING) return '起草中';
  if (status === STATUS.SIGNED) return '已双签';
  if (status === STATUS.VOIDED) return '已关闭';
  if (status === 'WAITING') return '等待对方响应';
  return status || '';
}

/**
 * 一方完成核验门后打标。双方都过才进入 SIGNED。
 */
function markCertified(rel, side, certifyResult, opts) {
  opts = opts || {};
  if (!certifyResult || !certifyResult.ok) {
    return { ok: false, reason: 'certify', message: (certifyResult && certifyResult.message) || '核验未通过' };
  }
  if (!rel || rel.status !== STATUS.DRAFTING) {
    return { ok: false, reason: 'state', message: '须在起草中确认' };
  }
  side = side === 'B' ? 'B' : 'A';
  rel.certified = rel.certified || { A: false, B: false };
  rel.certified[side] = true;
  rel.updatedAt = opts.now || Date.now();

  if (rel.certified.A && rel.certified.B) {
    return sealSigned(rel, opts);
  }
  return { ok: true, relation: rel, pendingSide: rel.certified.A ? 'B' : 'A' };
}

function sealSigned(rel, opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  rel.status = STATUS.SIGNED;
  rel.inviteeView = STATUS.SIGNED;
  rel.digest = '0xsim_' + identity.demoUid({ demo: { activeUid: 'local' } }).slice(-4) + '_' + (now % 1e8).toString(16);
  // fix digest to be deterministic from id
  rel.digest = '0xsim_' + String(rel.id).replace(/\W/g, '') + '_' + (now % 1e6).toString(16);
  rel.txId = 'zx_sim_' + now;
  rel.anchoredLabel = '待锚定（模拟）';
  rel.updatedAt = now;
  return { ok: true, relation: rel, sealed: true };
}

module.exports = {
  STATUS: STATUS,
  createInvite: createInvite,
  acceptInvite: acceptInvite,
  declineInvite: declineInvite,
  viewForRole: viewForRole,
  labelFor: labelFor,
  markCertified: markCertified,
  sealSigned: sealSigned,
};
