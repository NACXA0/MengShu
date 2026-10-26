/**
 * 身份层纯逻辑（本地模拟）。不依赖 my。
 * 状态形状见 createEmptyIdentityState。
 */
var COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
var DEMO_UID_DEFAULT = 'demo_uid_alipay_001';

function createEmptyIdentityState() {
  return {
    session: null,
    /** uid → { userId, createdAt } */
    accounts: {},
    /** uid → cooldownUntil (ms) */
    cooldowns: {},
    demo: {
      activeUid: DEMO_UID_DEFAULT,
      certifyDown: false,
      uidSeq: 1,
    },
  };
}

function demoUid(state) {
  return (state.demo && state.demo.activeUid) || DEMO_UID_DEFAULT;
}

function setCertifyDown(state, down) {
  state.demo = state.demo || {};
  state.demo.certifyDown = !!down;
  return state;
}

function isCertifyDown(state) {
  return !!(state.demo && state.demo.certifyDown);
}

function rotateDemoUid(state) {
  state.demo = state.demo || {};
  state.demo.uidSeq = (state.demo.uidSeq || 1) + 1;
  var n = String(state.demo.uidSeq);
  while (n.length < 3) n = '0' + n;
  state.demo.activeUid = 'demo_uid_alipay_' + n;
  return state.demo.activeUid;
}

function cooldownRemainingDays(state, uid, now) {
  now = now || Date.now();
  var until = state.cooldowns && state.cooldowns[uid];
  if (!until || until <= now) return 0;
  return Math.ceil((until - now) / (24 * 60 * 60 * 1000));
}

/**
 * 进入 / 注册。
 * @returns {{ ok: boolean, reason?: string, message?: string, session?: object }}
 */
function register(state, opts) {
  opts = opts || {};
  var uid = opts.uid || demoUid(state);
  var now = opts.now || Date.now();
  var adult = !!opts.adultDeclared;

  if (!adult) {
    return { ok: false, reason: 'adult', message: '须声明已满 18 周岁' };
  }

  var days = cooldownRemainingDays(state, uid, now);
  if (days > 0) {
    return {
      ok: false,
      reason: 'cooldown',
      message: '该支付宝在注销冷静期内（剩余 ' + days + ' 天）',
      days: days,
    };
  }

  if (state.accounts && state.accounts[uid]) {
    // 已有账号：恢复会话（同 uid 再登录）
    var acc = state.accounts[uid];
    state.session = {
      userId: acc.userId,
      alipayUid: uid,
      createdAt: acc.createdAt,
      loggedInAt: now,
    };
    return { ok: true, session: state.session, restored: true };
  }

  var userId = 'u_' + uid + '_' + now;
  state.accounts = state.accounts || {};
  state.accounts[uid] = { userId: userId, createdAt: now };
  state.session = {
    userId: userId,
    alipayUid: uid,
    createdAt: now,
    loggedInAt: now,
  };
  return { ok: true, session: state.session, restored: false };
}

/**
 * 模拟「已绑定拒绝」：同一 uid 在已有 session 以外强行再开号。
 * 演示开关：若账号存在且 forceNew=true，则拒绝。
 */
function refuseIfBound(state, uid) {
  if (state.accounts && state.accounts[uid] && !state.session) {
    return { ok: false, reason: 'bound', message: '该支付宝已绑定盟书账号' };
  }
  return { ok: true };
}

/**
 * 强制「二次注册拒绝」路径（US-F9）：清空 session 后用同一 uid 且账户仍在。
 * 实际产品里 UNIQUE 在服务端；此处用 accounts 表模拟。
 * 若调用方要求必须拒绝已存在账户（而非恢复会话），用 registerOrRefuse。
 */
function registerOrRefuse(state, opts) {
  opts = opts || {};
  var uid = opts.uid || demoUid(state);
  var now = opts.now || Date.now();
  var adult = !!opts.adultDeclared;
  var refuseExisting = !!opts.refuseExisting;

  if (!adult) {
    return { ok: false, reason: 'adult', message: '须声明已满 18 周岁' };
  }

  var days = cooldownRemainingDays(state, uid, now);
  if (days > 0) {
    return {
      ok: false,
      reason: 'cooldown',
      message: '该支付宝在注销冷静期内（剩余 ' + days + ' 天）',
      days: days,
    };
  }

  if (state.accounts && state.accounts[uid]) {
    if (refuseExisting) {
      return { ok: false, reason: 'bound', message: '该支付宝已绑定盟书账号' };
    }
    return register(state, opts);
  }

  return register(state, opts);
}

function hasSession(state) {
  return !!(state && state.session && state.session.alipayUid);
}

function getSession(state) {
  return (state && state.session) || null;
}

/**
 * 注销完成（须已通过核验门）。清空 session、删账号、写入冷却。
 */
function completeLogout(state, opts) {
  opts = opts || {};
  var now = opts.now || Date.now();
  var session = state.session;
  if (!session) {
    return { ok: false, reason: 'no_session', message: '未登录' };
  }
  var uid = session.alipayUid;
  state.cooldowns = state.cooldowns || {};
  state.cooldowns[uid] = now + COOLDOWN_MS;
  if (state.accounts) delete state.accounts[uid];
  state.session = null;
  return { ok: true, uid: uid, cooldownUntil: state.cooldowns[uid] };
}

/**
 * 核验门结果。fail-closed：服务中断或用户取消都不放行。
 * @returns {{ ok: boolean, reason?: string, message?: string }}
 */
function certify(state, opts) {
  opts = opts || {};
  if (isCertifyDown(state)) {
    return {
      ok: false,
      reason: 'service_down',
      message: '身份核验服务暂不可用，请稍后重试',
    };
  }
  if (opts.cancelled) {
    return { ok: false, reason: 'cancelled', message: '已取消核验' };
  }
  if (opts.failed) {
    return { ok: false, reason: 'failed', message: '核验未通过' };
  }
  return {
    ok: true,
    action: opts.action || '',
    at: opts.now || Date.now(),
  };
}

module.exports = {
  COOLDOWN_MS: COOLDOWN_MS,
  DEMO_UID_DEFAULT: DEMO_UID_DEFAULT,
  createEmptyIdentityState: createEmptyIdentityState,
  demoUid: demoUid,
  setCertifyDown: setCertifyDown,
  isCertifyDown: isCertifyDown,
  rotateDemoUid: rotateDemoUid,
  cooldownRemainingDays: cooldownRemainingDays,
  register: register,
  registerOrRefuse: registerOrRefuse,
  refuseIfBound: refuseIfBound,
  hasSession: hasSession,
  getSession: getSession,
  completeLogout: completeLogout,
  certify: certify,
};
