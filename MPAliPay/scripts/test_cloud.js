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
  var m1 = sign.markCertified(rel, 'A', c);
  assert.strictEqual(m1.ok, true);
  var m2 = sign.markCertified(rel, 'B', c);
  assert.strictEqual(m2.sealed, true);
  var saved = handlers.relationSave({ relation: rel }, 'oid_s', repo);
  assert.strictEqual(saved.ok, true);
  assert.strictEqual(saved.relation.status, 'SIGNED');
  assert.strictEqual(saved.relation.anchoredLabel, '待锚定（模拟）');
  ok('双方核验后落库 SIGNED');
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
