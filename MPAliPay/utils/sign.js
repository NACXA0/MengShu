/**
 * 同机双签状态机（本地模拟）。
 * INVITED → DRAFTING → SIGNED（→ 写入模拟存证编号）
 * 拒绝/放弃：邀请方仍只见「等待对方响应」
 *
 * 承诺根（L2 披露口径）：双签完成时双方互锚各自档案的哈希根快照。
 * 根只是指纹，明文不出本机；此后档案任何增减都会改变根，可被对方核验发现。
 */
var identity = require('./identity');

var STATUS = {
  INVITED: 'INVITED',
  DRAFTING: 'DRAFTING',
  SIGNED: 'SIGNED',
  VOIDED: 'VOIDED',
};

/** FNV-1a 32 位（模拟 SM3，与 vault.js simpleHash 同口径） */
function leafHash(str) {
  var h = 2166136261;
  var s = String(str || '');
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

/**
 * 档案承诺根：关系 id+updatedAt 排序后逐级归并（模拟 SM3 Merkle 根）。
 * 对方只能看到根指纹与段数，看不到任何关系内容。
 */
function commitmentRoot(relations) {
  var list = (relations || []).slice().sort(function (a, b) {
    var ka = a.id + ':' + a.updatedAt;
    var kb = b.id + ':' + b.updatedAt;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  if (!list.length) return leafHash('mengshu:empty');
  var level = [];
  for (var i = 0; i < list.length; i++) {
    level.push(leafHash(list[i].id + ':' + list[i].updatedAt));
  }
  while (level.length > 1) {
    var next = [];
    for (var j = 0; j < level.length; j += 2) {
      if (j + 1 < level.length) next.push(leafHash(level[j] + level[j + 1]));
      else next.push(leafHash(level[j] + level[j]));
    }
    level = next;
  }
  return level[0];
}

/** 双签完成时的档案快照（段数 + 根 + 时间） */
function anchorSnapshot(relations, opts) {
  opts = opts || {};
  return {
    count: (relations || []).length,
    root: commitmentRoot(relations),
    at: opts.now || Date.now(),
  };
}

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
    /** 双签完成时互锚的档案快照（anchorSnapshot） */
    anchor: null,
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
 * opts.relations：本方当前全部关系，双签完成时用于锚定档案快照。
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
  // 双签即互锚：双方档案快照（同机演示中 A/B 共享同一列表，各自视角仍由快照保证可比对）
  rel.anchor = anchorSnapshot(opts.relations || [], { now: now });
  rel.updatedAt = now;
  return { ok: true, relation: rel, sealed: true };
}

/**
 * 承诺核验：给定承诺时快照与当前档案，返回变化描述（中性措辞，D5 无评判）。
 * 返回 null 表示无变化；否则 { drift: number, label: string }。
 */
function anchorDrift(anchor, relations) {
  if (!anchor || !anchor.root) return null;
  var count = (relations || []).length;
  var drift = count - (anchor.count || 0);
  if (drift === 0 && commitmentRoot(relations) === anchor.root) return null;
  var sign = drift > 0 ? '+' : '';
  return {
    drift: drift,
    label: '对方档案已变化（' + sign + drift + ' 段）· 内容不可见',
  };
}

module.exports = {
  STATUS: STATUS,
  leafHash: leafHash,
  commitmentRoot: commitmentRoot,
  anchorSnapshot: anchorSnapshot,
  anchorDrift: anchorDrift,
  createInvite: createInvite,
  acceptInvite: acceptInvite,
  declineInvite: declineInvite,
  viewForRole: viewForRole,
  labelFor: labelFor,
  markCertified: markCertified,
  sealSigned: sealSigned,
};
