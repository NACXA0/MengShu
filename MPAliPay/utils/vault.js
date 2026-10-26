/**
 * 保险库本地模拟锁（口令哈希，非 SM4）。
 * 明文关系仅在 unlock 后的内存镜像中；持久化只存 locked blob。
 */
var WORDS = [
  '落墨', '为盟', '双方', '共守', '纸面', '印泥', '存证', '核验',
  '冷静', '边界', '保险', '密钥', '助记', '派生', '锚定', '陈述',
  '公示', '撤回', '授权', '档案', '关系', '关闭', '和平', '单方',
  '宣誓', '完整', '哈希', '签名', '本地', '沙箱', '冷却', '注销',
];

function simpleHash(str) {
  var h = 2166136261;
  var s = String(str || '');
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function createEmptyVault() {
  return {
    locked: false,
    passHash: '',
    salt: '',
    mnemonic: '',
    relations: [],
    unlocked: false,
  };
}

function randomSalt() {
  return simpleHash('salt_' + Date.now() + '_' + Math.random());
}

function genMnemonic() {
  var picked = [];
  var used = {};
  while (picked.length < 12) {
    var w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (used[w]) continue;
    used[w] = true;
    picked.push(w);
  }
  return picked.join(' ');
}

function setPassphrase(vault, passphrase) {
  var pass = String(passphrase || '');
  if (pass.length < 4) {
    return { ok: false, reason: 'short', message: '口令至少 4 位（本地模拟）' };
  }
  vault.salt = vault.salt || randomSalt();
  vault.passHash = simpleHash(vault.salt + '|' + pass);
  vault.locked = true;
  vault.unlocked = true;
  if (!vault.mnemonic) vault.mnemonic = genMnemonic();
  return { ok: true };
}

function unlock(vault, passphrase) {
  if (!vault.locked || !vault.passHash) {
    vault.unlocked = true;
    return { ok: true };
  }
  var h = simpleHash(vault.salt + '|' + String(passphrase || ''));
  if (h !== vault.passHash) {
    vault.unlocked = false;
    return { ok: false, reason: 'bad_pass', message: '口令不正确' };
  }
  vault.unlocked = true;
  return { ok: true };
}

function lock(vault) {
  vault.unlocked = false;
  return vault;
}

function isUnlocked(vault) {
  return !!(vault && vault.unlocked);
}

function exportBackup(vault) {
  if (!vault.unlocked) {
    return { ok: false, reason: 'locked', message: '请先解锁保险库' };
  }
  return {
    ok: true,
    mnemonic: vault.mnemonic,
    note: '本地模拟助记词，非 BIP39 / 非国密备份包',
  };
}

function restoreFromMnemonic(vault, mnemonic, passphrase) {
  var m = String(mnemonic || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!m || m.split(' ').length < 8) {
    return { ok: false, reason: 'mnemonic', message: '助记词不完整' };
  }
  var set = setPassphrase(vault, passphrase);
  if (!set.ok) return set;
  vault.mnemonic = m;
  vault.unlocked = true;
  return { ok: true };
}

function destroy(vault) {
  vault.locked = false;
  vault.passHash = '';
  vault.salt = '';
  vault.mnemonic = '';
  vault.relations = [];
  vault.unlocked = false;
  return { ok: true };
}

function listRelations(vault) {
  if (!isUnlocked(vault)) return [];
  return vault.relations || [];
}

function upsertRelation(vault, rel) {
  if (!isUnlocked(vault)) {
    return { ok: false, reason: 'locked' };
  }
  vault.relations = vault.relations || [];
  var found = -1;
  for (var i = 0; i < vault.relations.length; i++) {
    if (vault.relations[i].id === rel.id) found = i;
  }
  if (found >= 0) vault.relations[found] = rel;
  else vault.relations.unshift(rel);
  return { ok: true, relation: rel };
}

function getRelation(vault, id) {
  var list = vault.relations || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

module.exports = {
  WORDS: WORDS,
  simpleHash: simpleHash,
  createEmptyVault: createEmptyVault,
  setPassphrase: setPassphrase,
  unlock: unlock,
  lock: lock,
  isUnlocked: isUnlocked,
  exportBackup: exportBackup,
  restoreFromMnemonic: restoreFromMnemonic,
  destroy: destroy,
  listRelations: listRelations,
  upsertRelation: upsertRelation,
  getRelation: getRelation,
  genMnemonic: genMnemonic,
};
