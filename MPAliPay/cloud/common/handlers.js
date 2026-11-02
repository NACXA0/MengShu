/**
 * 云函数业务逻辑。handle(data, openId, repo) → 结果对象。
 * 不依赖支付宝 SDK，便于 Node 断言。
 */
var memoryRepo = require('./memoryRepo');
var COOLDOWN_MS = memoryRepo.COOLDOWN_MS;

function requireOpenId(openId) {
  if (!openId) {
    return { ok: false, reason: 'no_openid', message: '无法获取支付宝 openid，请在开放平台开启 openid 并关联云环境' };
  }
  return null;
}

function cooldownDays(repo, openId, now) {
  now = now || Date.now();
  var until = repo.getCooldownUntil(openId);
  if (!until || until <= now) return 0;
  return Math.ceil((until - now) / (24 * 60 * 60 * 1000));
}

function formatNow() {
  var d = new Date();
  var p = function (n) {
    return n < 10 ? '0' + n : '' + n;
  };
  return (
    d.getFullYear() +
    '年' +
    (d.getMonth() + 1) +
    '月' +
    d.getDate() +
    '日 ' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  );
}

function authEnter(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  data = data || {};
  var now = data.now || Date.now();
  var adult = !!data.adultDeclared;
  var refuseExisting = !!data.refuseExisting;

  if (!adult) {
    return { ok: false, reason: 'adult', message: '须声明已满 18 周岁' };
  }

  var days = cooldownDays(repo, openId, now);
  if (days > 0) {
    return {
      ok: false,
      reason: 'cooldown',
      message: '该支付宝在注销冷静期内（剩余 ' + days + ' 天）',
      days: days,
    };
  }

  var user = repo.getUser(openId);
  if (user) {
    if (refuseExisting) {
      return { ok: false, reason: 'bound', message: '该支付宝已绑定盟书账号' };
    }
    return {
      ok: true,
      restored: true,
      session: {
        userId: user.userId,
        openId: openId,
        createdAt: user.createdAt,
        loggedInAt: now,
      },
    };
  }

  var userId = 'u_' + openId.slice(-8) + '_' + now;
  var doc = { userId: userId, openId: openId, createdAt: now };
  repo.putUser(openId, doc);
  return {
    ok: true,
    restored: false,
    session: {
      userId: userId,
      openId: openId,
      createdAt: now,
      loggedInAt: now,
    },
  };
}

function authLogout(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  data = data || {};
  var now = data.now || Date.now();
  var user = repo.getUser(openId);
  if (!user) {
    return { ok: false, reason: 'no_session', message: '未登录' };
  }
  repo.deleteUser(openId);
  repo.setCooldown(openId, now + COOLDOWN_MS);
  return { ok: true, openId: openId, cooldownUntil: now + COOLDOWN_MS };
}

function certifyCheck(data, openId, repo) {
  data = data || {};
  if (repo.isCertifyDown()) {
    return {
      ok: false,
      reason: 'service_down',
      message: '身份验证服务暂不可用，请稍后重试',
    };
  }
  if (data.cancelled) {
    return { ok: false, reason: 'cancelled', message: '已取消身份验证' };
  }
  return {
    ok: true,
    action: data.action || '',
    openId: openId || '',
    at: data.now || Date.now(),
  };
}

function demoSetCertifyDown(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  var down = !!(data && data.down);
  repo.setCertifyDown(down);
  return { ok: true, certifyDown: down };
}

function relationList(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  if (!repo.getUser(openId)) {
    return { ok: false, reason: 'no_session', message: '未登录' };
  }
  return { ok: true, relations: repo.listRelations(openId) };
}

function relationSave(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  if (!repo.getUser(openId)) {
    return { ok: false, reason: 'no_session', message: '未登录' };
  }
  var rel = data && data.relation;
  if (!rel || !rel.id) {
    return { ok: false, reason: 'bad_relation', message: '缺少关系档案' };
  }
  // 归属：只能写自己的
  rel.ownerOpenId = openId;
  var saved = repo.saveRelation(openId, rel);
  return { ok: true, relation: saved };
}

function plazaGet(data, openId, repo) {
  var id = (data && data.id) || 'pb_lin';
  if (id === 'me') {
    // 本人查自己的名片：未开启时返回空档案（首页卡片据此显示引导态）
    var own = openId ? repo.getProfileByOwner(openId) : null;
    return { ok: true, profile: own };
  }
  var profile = repo.getProfile(id);
  if (!profile) {
    return { ok: false, reason: 'not_found', message: '未找到公开页' };
  }
  return { ok: true, profile: profile };
}

/** 段数 → 展示区间（PRD FR-A1：区间化，禁止精确数字公示） */
function bandForCount(n) {
  if (n <= 2) return '0-2';
  if (n <= 5) return '3-5';
  if (n <= 8) return '6-8';
  return '9+';
}

/**
 * 公示名片管理（仅本人）。
 * action='open'：挂出/重新挂出/更新（前端须先过 certify(action='plaza') 门控）。
 * action='withdraw'：一键撤下——撤下是用户权利，不设门控（PRD US-04）。
 */
function plazaSet(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  if (!repo.getUser(openId)) {
    return { ok: false, reason: 'no_session', message: '未登录' };
  }
  var action = (data && data.action) || '';
  var existing = repo.getProfileByOwner(openId);

  if (action === 'withdraw') {
    if (!existing || existing.withdrawn) {
      return { ok: false, reason: 'not_open', message: '公示未挂出' };
    }
    existing.withdrawn = true;
    repo.putProfile(existing);
    return { ok: true, profile: existing };
  }

  if (action !== 'open') {
    return { ok: false, reason: 'bad_action', message: '未知操作' };
  }

  var statement = String((data && data.statement) || (existing && existing.statements && existing.statements.length ? existing.statements[0].body : '') || '');
  if (statement.length > 100) {
    return { ok: false, reason: 'statement_too_long', message: '陈述不超过 100 字' };
  }

  var rels = repo.listRelations(openId);
  var signed = 0;
  for (var i = 0; i < rels.length; i++) {
    if (rels[i].status === 'SIGNED') signed++;
  }
  var user = repo.getUser(openId) || {};
  var created = new Date(user.createdAt || Date.now());
  var registered = created.getFullYear() + '年' + (created.getMonth() + 1) + '月';

  var profile = existing || {
    id: 'me_' + String(openId).replace(/\W/g, ''),
    ownerOpenId: openId,
    publicId: 'pb_' + String(openId).replace(/\W/g, '').slice(-8),
    statements: [],
  };
  profile.name = String((data && data.name) || profile.name || '我');
  profile.band = bandForCount(signed);
  profile.closure = '存续 ' + signed;
  profile.attestation = profile.attestation === 'verified' ? 'verified' : 'none';
  profile.attestationLabel = profile.attestation === 'verified' ? '已宣誓' : '未宣誓';
  profile.anchored = true;
  profile.registered = registered;
  profile.dividend = '本平台不就机构查询收取运营费；全平台唯一付费项为支付宝身份验证';
  if (statement) {
    profile.statements = [{ side: 'A', body: statement, date: formatNow() }];
  }
  profile.withdrawn = false;
  repo.putProfile(profile);
  return { ok: true, profile: profile };
}

function verifyRedeem(data, openId, repo) {
  var code = String((data && data.code) || '')
    .trim()
    .toUpperCase();
  if (!/^MS-[A-Z0-9]{4,}$/.test(code) && code !== 'MS-VALID' && code !== 'MS-EXPIRED') {
    return { ok: false, reason: 'format' };
  }
  var item = repo.findCode(code);
  if (!item) {
    return { ok: false, reason: 'format' };
  }
  var expired = item.status === 'expired' || item.used;
  item.used = true;
  repo.saveCode(item);
  var log = {
    id: 'log_' + Date.now(),
    code: code,
    tail: code.slice(-4),
    time: formatNow(),
    expired: expired,
    profileId: item.profileId,
  };
  if (openId) repo.addVerifyLog(openId, log);
  if (expired) {
    return { ok: false, reason: 'expired', code: code, log: log };
  }
  return {
    ok: true,
    code: code,
    profile: repo.getProfile(item.profileId),
    fields: item.fields,
    log: log,
  };
}

function verifyLogs(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return { ok: true, logs: [] };
  return { ok: true, logs: repo.listVerifyLogs(openId) };
}

function consentAdd(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return err;
  var entry = {
    id: 'c_' + Date.now(),
    org: (data && data.org) || '',
    fields: (data && data.fields) || '',
    time: formatNow(),
  };
  repo.addConsent(openId, entry);
  return { ok: true, entry: entry };
}

function consentList(data, openId, repo) {
  var err = requireOpenId(openId);
  if (err) return { ok: true, consents: [] };
  return { ok: true, consents: repo.listConsents(openId) };
}

function reportAdd(data, openId, repo) {
  var entry = {
    profileId: (data && data.profileId) || '',
    reason: (data && data.reason) || '',
    time: formatNow(),
    reporter: openId || '',
  };
  repo.addReport(entry);
  return { ok: true, entry: entry };
}

function getOrg(data, openId, repo) {
  var org = repo.getOrg((data && data.id) || 'org_seed');
  if (!org) return { ok: false, reason: 'not_found' };
  return { ok: true, org: org };
}

module.exports = {
  COOLDOWN_MS: COOLDOWN_MS,
  authEnter: authEnter,
  authLogout: authLogout,
  certifyCheck: certifyCheck,
  demoSetCertifyDown: demoSetCertifyDown,
  relationList: relationList,
  relationSave: relationSave,
  plazaGet: plazaGet,
  plazaSet: plazaSet,
  verifyRedeem: verifyRedeem,
  verifyLogs: verifyLogs,
  consentAdd: consentAdd,
  consentList: consentList,
  reportAdd: reportAdd,
  getOrg: getOrg,
};
