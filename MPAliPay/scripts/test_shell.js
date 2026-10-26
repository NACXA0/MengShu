/**
 * Node 断言：身份 / 核验门 / 双签 / 保险库锁。不依赖 my。
 * 运行：node MPAliPay/scripts/test_shell.js
 */
var assert = require('assert');
var path = require('path');

var root = path.join(__dirname, '..');
var identity = require(path.join(root, 'utils/identity.js'));
var vault = require(path.join(root, 'utils/vault.js'));
var sign = require(path.join(root, 'utils/sign.js'));

var passed = 0;
function ok(name) {
  passed += 1;
  console.log('  ok  ' + name);
}

console.log('identity');
(function () {
  var s = identity.createEmptyIdentityState();
  var r = identity.registerOrRefuse(s, { adultDeclared: false, uid: 'u1' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'adult');
  ok('拒绝未声明 18+');

  r = identity.registerOrRefuse(s, { adultDeclared: true, uid: 'u1' });
  assert.strictEqual(r.ok, true);
  assert.ok(identity.hasSession(s));
  ok('注册成功');

  s.session = null;
  r = identity.registerOrRefuse(s, { adultDeclared: true, uid: 'u1', refuseExisting: true });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'bound');
  assert.ok(r.message.indexOf('已绑定') >= 0);
  ok('已绑定拒绝');

  s.session = { userId: 'x', alipayUid: 'u1', createdAt: 1, loggedInAt: 1 };
  r = identity.completeLogout(s, { now: 1000 });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(identity.hasSession(s), false);
  assert.ok(s.cooldowns.u1 > 1000);
  ok('注销写入冷却');

  r = identity.registerOrRefuse(s, { adultDeclared: true, uid: 'u1', now: 2000 });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'cooldown');
  assert.ok(r.message.indexOf('冷静期') >= 0);
  ok('冷却期内拒绝');

  var after = 1000 + identity.COOLDOWN_MS + 1;
  r = identity.registerOrRefuse(s, { adultDeclared: true, uid: 'u1', now: after });
  assert.strictEqual(r.ok, true);
  ok('冷却期满可重注');
})();

console.log('certify fail-closed');
(function () {
  var s = identity.createEmptyIdentityState();
  identity.setCertifyDown(s, true);
  var r = identity.certify(s, { action: 'sign' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'service_down');
  assert.ok(r.message.indexOf('暂不可用') >= 0);
  ok('服务中断不放行');

  identity.setCertifyDown(s, false);
  r = identity.certify(s, { action: 'consent', cancelled: true });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'cancelled');
  ok('取消不落账');

  r = identity.certify(s, { action: 'logout' });
  assert.strictEqual(r.ok, true);
  ok('正常确认放行');
})();

console.log('vault lock');
(function () {
  var v = vault.createEmptyVault();
  var r = vault.setPassphrase(v, 'ab');
  assert.strictEqual(r.ok, false);
  ok('口令过短拒绝');

  r = vault.setPassphrase(v, 'secret');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(v.unlocked, true);

  vault.lock(v);
  r = vault.unlock(v, 'wrong');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(v.unlocked, false);
  ok('错误口令打不开');

  r = vault.unlock(v, 'secret');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(v.unlocked, true);
  ok('正确口令解锁');

  var bak = vault.exportBackup(v);
  assert.strictEqual(bak.ok, true);
  assert.ok(bak.mnemonic.split(' ').length >= 8);
  ok('导出助记词');

  vault.destroy(v);
  assert.strictEqual(v.relations.length, 0);
  assert.strictEqual(v.passHash, '');
  ok('销毁清空');
})();

console.log('sign state machine');
(function () {
  var rel = sign.createInvite({ title: '测' });
  assert.strictEqual(rel.status, 'INVITED');

  var d = sign.declineInvite(rel);
  assert.strictEqual(d.ok, true);
  var inviterView = sign.viewForRole(rel, 'A');
  assert.strictEqual(inviterView.displayLabel, '等待对方响应');
  ok('拒绝后邀请方仍见等待');

  rel = sign.createInvite({ title: '测2' });
  sign.acceptInvite(rel);
  assert.strictEqual(rel.status, 'DRAFTING');

  var bad = sign.markCertified(rel, 'A', { ok: false, message: 'x' });
  assert.strictEqual(bad.ok, false);
  ok('核验失败不推进');

  var c1 = sign.markCertified(rel, 'A', { ok: true });
  assert.strictEqual(c1.ok, true);
  assert.strictEqual(!!c1.sealed, false);
  var c2 = sign.markCertified(rel, 'B', { ok: true });
  assert.strictEqual(c2.ok, true);
  assert.strictEqual(c2.sealed, true);
  assert.strictEqual(rel.status, 'SIGNED');
  assert.ok(rel.txId.indexOf('zx_sim_') === 0);
  assert.strictEqual(rel.anchoredLabel, '待锚定（模拟）');
  ok('双方核验后 SIGNED 并生成模拟存证');
})();

console.log('\n' + passed + ' assertions passed');
