/**
 * 云函数 handlers + 保险库口令。不依赖 my / 支付宝 SDK。
 * 运行：node MPAliPay/scripts/test_cloud.js
 */
var assert = require('assert');
var path = require('path');

var root = path.join(__dirname, '..');
var handlers = require(path.join(root, 'cloud/common/handlers.js'));
var memoryRepo = require(path.join(root, 'cloud/common/memoryRepo.js'));
var vault = require(path.join(root, 'utils/vault.js'));
var sign = require(path.join(root, 'utils/sign.js'));

var passed = 0;
function ok(name) {
  passed += 1;
  console.log('  ok  ' + name);
}

console.log('authEnter / cooldown / bound');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  var r = handlers.authEnter({ adultDeclared: false }, 'oid_a', repo);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'adult');
  ok('拒绝未声明 18+');

  r = handlers.authEnter({ adultDeclared: true }, 'oid_a', repo);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.restored, false);
  assert.ok(repo.getUser('oid_a'));
  ok('注册成功');

  r = handlers.authEnter({ adultDeclared: true, refuseExisting: true }, 'oid_a', repo);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'bound');
  ok('已绑定拒绝');

  r = handlers.authEnter({ adultDeclared: true }, 'oid_a', repo);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.restored, true);
  ok('同 OPENID 恢复会话');

  r = handlers.authLogout({ now: 1000 }, 'oid_a', repo);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(repo.getUser('oid_a'), null);
  ok('注销删用户');

  r = handlers.authEnter({ adultDeclared: true, now: 2000 }, 'oid_a', repo);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'cooldown');
  assert.ok(r.message.indexOf('冷静期') >= 0);
  ok('冷却期内拒绝');

  var after = 1000 + handlers.COOLDOWN_MS + 1;
  r = handlers.authEnter({ adultDeclared: true, now: after }, 'oid_a', repo);
  assert.strictEqual(r.ok, true);
  ok('冷却期满可重注');
})();

console.log('certifyCheck fail-closed');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  repo.setCertifyDown(true);
  var r = handlers.certifyCheck({ action: 'sign' }, 'oid_b', repo);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'service_down');
  assert.ok(r.message.indexOf('身份验证') >= 0);
  assert.ok(r.message.indexOf('暂不可用') >= 0);
  ok('服务中断不放行');

  repo.setCertifyDown(false);
  r = handlers.certifyCheck({ action: 'consent', cancelled: true }, 'oid_b', repo);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'cancelled');
  ok('取消不落账');

  r = handlers.certifyCheck({ action: 'logout' }, 'oid_b', repo);
  assert.strictEqual(r.ok, true);
  ok('正常确认放行');
})();

console.log('relation ownership');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  handlers.authEnter({ adultDeclared: true }, 'oid_owner', repo);
  handlers.authEnter({ adultDeclared: true }, 'oid_other', repo);

  var rel = sign.createInvite({ title: '归属测' });
  var save = handlers.relationSave({ relation: rel }, 'oid_owner', repo);
  assert.strictEqual(save.ok, true);
  assert.strictEqual(save.relation.ownerOpenId, 'oid_owner');
  ok('保存打上 ownerOpenId');

  var listOwner = handlers.relationList({}, 'oid_owner', repo);
  assert.strictEqual(listOwner.relations.length, 1);
  var listOther = handlers.relationList({}, 'oid_other', repo);
  assert.strictEqual(listOther.relations.length, 0);
  ok('他人列不出你的关系');
})();

console.log('vault passphrase');
(function () {
  var v = vault.createEmptyVault();
  assert.strictEqual(vault.setPassphrase(v, 'ab').ok, false);
  ok('口令过短拒绝');

  assert.strictEqual(vault.setPassphrase(v, 'secret').ok, true);
  vault.lock(v);
  assert.strictEqual(vault.unlock(v, 'wrong').ok, false);
  assert.strictEqual(v.unlocked, false);
  ok('错误口令打不开');

  assert.strictEqual(vault.unlock(v, 'secret').ok, true);
  ok('正确口令解锁');
})();

console.log('sign + certify then save');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  handlers.authEnter({ adultDeclared: true }, 'oid_s', repo);
  var rel = sign.createInvite({ title: '双签云' });
  sign.acceptInvite(rel);
  var c = handlers.certifyCheck({ action: 'sign' }, 'oid_s', repo);
  assert.strictEqual(c.ok, true);
  var m1 = sign.markCertified(rel, 'A', c, { relations: [] });
  assert.strictEqual(m1.ok, true);
  var m2 = sign.markCertified(rel, 'B', c, { relations: [rel] });
  assert.strictEqual(m2.sealed, true);
  var saved = handlers.relationSave({ relation: rel }, 'oid_s', repo);
  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.relation.status, 'SIGNED');
  assert.strictEqual(saved.relation.anchoredLabel, '待锚定（模拟）');
  ok('双方核验后落库 SIGNED');
})();

console.log('commitment root / anchor drift');
(function () {
  var r1 = sign.createInvite({ title: '甲', now: 1000 });
  var r2 = sign.createInvite({ title: '乙', now: 2000 });
  var rootA = sign.commitmentRoot([r1, r2]);
  var rootB = sign.commitmentRoot([r2, r1]);
  assert.strictEqual(rootA, rootB);
  ok('承诺根与顺序无关');
  assert.notEqual(sign.commitmentRoot([r1]), rootA);
  ok('档案变化改变根');
  assert.strictEqual(sign.anchorDrift(null, [r1]), null);
  ok('无快照不判变化');

  // 双签时锚定快照，此后新增关系可被检出差值
  var rel = sign.createInvite({ title: '锚', now: 3000 });
  sign.acceptInvite(rel);
  var c = { ok: true, action: 'sign' };
  sign.markCertified(rel, 'A', c, { relations: [rel], now: 3001 });
  var m = sign.markCertified(rel, 'B', c, { relations: [rel], now: 3002 });
  assert.strictEqual(m.sealed, true);
  assert.strictEqual(rel.anchor.count, 1);
  assert.strictEqual(sign.anchorDrift(rel.anchor, [rel]), null);
  ok('双签写入承诺快照且当时无差');

  var next = sign.createInvite({ title: '并行', now: 4000 });
  var drift = sign.anchorDrift(rel.anchor, [rel, next]);
  assert.strictEqual(drift.drift, 1);
  assert.ok(drift.label.indexOf('+1') >= 0);
  assert.ok(drift.label.indexOf('内容不可见') >= 0);
  ok('新增一段被检为 +1 且不泄露内容');
})();

console.log('plaza set / my profile');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  handlers.authEnter({ adultDeclared: true }, 'oid_p', repo);
  handlers.authEnter({ adultDeclared: true }, 'oid_q', repo);

  var mine = handlers.plazaGet({ id: 'me' }, 'oid_p', repo);
  assert.strictEqual(mine.ok, true);
  assert.strictEqual(mine.profile, null);
  ok('未开启时我的名片为空');

  var open = handlers.plazaSet({ action: 'open' }, 'oid_p', repo);
  assert.strictEqual(open.ok, true);
  assert.strictEqual(open.profile.withdrawn, false);
  assert.strictEqual(open.profile.band, '0-2');
  ok('开启公示挂出名片');

  var saved = handlers.relationSave(
    { relation: sign.createInvite({ title: '公示段', now: 5000 }) },
    'oid_p',
    repo
  );
  assert.strictEqual(saved.ok, true);
  var reopen = handlers.plazaSet({ action: 'open' }, 'oid_p', repo);
  assert.strictEqual(reopen.profile.band, '0-2');
  ok('重挂自动刷新区间');

  var wd = handlers.plazaSet({ action: 'withdraw' }, 'oid_p', repo);
  assert.strictEqual(wd.ok, true);
  assert.strictEqual(wd.profile.withdrawn, true);
  ok('一键撤下');

  var wdAgain = handlers.plazaSet({ action: 'withdraw' }, 'oid_p', repo);
  assert.strictEqual(wdAgain.ok, false);
  assert.strictEqual(wdAgain.reason, 'not_open');
  ok('重复撤下被拒');

  var other = handlers.plazaGet({ id: 'me' }, 'oid_q', repo);
  assert.strictEqual(other.profile, null);
  ok('他人查我的名片为空');

  var tooLong = handlers.plazaSet({ action: 'open', statement: new Array(102).join('字') }, 'oid_p', repo);
  assert.strictEqual(tooLong.ok, false);
  assert.strictEqual(tooLong.reason, 'statement_too_long');
  ok('陈述超百字被拒');

  var noSession = handlers.plazaSet({ action: 'open' }, 'oid_ghost', repo);
  assert.strictEqual(noSession.ok, false);
  assert.strictEqual(noSession.reason, 'no_session');
  ok('未登录不可操作名片');
})();

console.log('plaza / verify');
(function () {
  var repo = memoryRepo.createMemoryRepo();
  var p = handlers.plazaGet({ id: 'pb_lin' }, '', repo);
  assert.strictEqual(p.ok, true);
  assert.strictEqual(p.profile.name, '林晚');
  ok('公开页样例');

  var v = handlers.verifyRedeem({ code: 'MS-VALID' }, 'oid_v', repo);
  assert.strictEqual(v.ok, true);
  assert.ok(v.profile);
  ok('核销有效码');
})();

console.log('\n' + passed + ' assertions passed');
