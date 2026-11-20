import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('SG FRUIT - Thai Address Autocomplete 77 Provinces Suite', async (t) => {
  const code = fs.readFileSync(path.join(ROOT_DIR, 'js', 'thai-address.js'), 'utf8');
  const sandbox = { window: {}, console, Set, Event: function(){} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const autocomplete = sandbox.THAI_ADDRESS_AUTOCOMPLETE;

  await t.test('1. Database Initialization & Integrity', () => {
    assert.ok(autocomplete, 'THAI_ADDRESS_AUTOCOMPLETE must be defined');
    const db = autocomplete.getDB();
    assert.ok(Array.isArray(db), 'Database must be an array');
    assert.strictEqual(db.length, 7438, 'Database must contain 7,438 canonical Thai subdistricts');

    const provinces = new Set(db.map(item => item.province));
    assert.strictEqual(provinces.size, 77, 'Database must cover exactly 77 provinces');
  });

  await t.test('2. Zipcode Search (12120 & 10110)', () => {
    const res12120 = autocomplete.search('12120', 'postal', 10);
    assert.ok(res12120.length > 0, 'Must return results for 12120');
    assert.ok(res12120.every(item => item.zipcode === '12120'), 'All results must match zipcode 12120');
    assert.ok(res12120.some(item => item.amphoe === 'คลองหลวง' && item.province === 'ปทุมธานี'), 'Must contain คลองหลวง ปทุมธานี');

    const res10110 = autocomplete.search('10110', 'postal', 10);
    assert.ok(res10110.length > 0, 'Must return results for 10110');
    assert.ok(res10110.every(item => item.zipcode === '10110'), 'All results must match zipcode 10110');
    assert.ok(res10110.some(item => item.province === 'กรุงเทพมหานคร'), 'Must contain กรุงเทพมหานคร');
  });

  await t.test('3. Subdistrict / District Search (คลองสอง & บางรัก)', () => {
    const resKlongSong = autocomplete.search('คลองสอง', 'district', 10);
    assert.ok(resKlongSong.length > 0, 'Must find results for คลองสอง');
    assert.ok(resKlongSong.some(item => item.district === 'คลองสอง' && item.amphoe === 'คลองหลวง'), 'Must include คลองสอง คลองหลวง');

    const resBangRak = autocomplete.search('บางรัก', 'district', 10);
    assert.ok(resBangRak.length > 0, 'Must find results for บางรัก');
    assert.ok(resBangRak.some(item => item.province === 'กรุงเทพมหานคร'), 'Must include บางรัก กทม.');
  });

  await t.test('4. Amphoe Search (คลองหลวง & เมืองเชียงใหม่)', () => {
    const resKlongLuang = autocomplete.search('คลองหลวง', 'amphoe', 10);
    assert.ok(resKlongLuang.length > 0, 'Must find results for คลองหลวง');
    assert.ok(resKlongLuang.some(item => item.amphoe === 'คลองหลวง'), 'Must match amphoe คลองหลวง');

    const resChiangMai = autocomplete.search('เมืองเชียงใหม่', 'amphoe', 10);
    assert.ok(resChiangMai.length > 0, 'Must find results for เมืองเชียงใหม่');
    assert.ok(resChiangMai.some(item => item.province === 'เชียงใหม่'), 'Must match province เชียงใหม่');
  });

  await t.test('5. Province Search (ปทุมธานี & ภูเก็ต)', () => {
    const resPathum = autocomplete.search('ปทุมธานี', 'province', 10);
    assert.ok(resPathum.length > 0, 'Must find results for ปทุมธานี');
    assert.ok(resPathum.every(item => item.province === 'ปทุมธานี'), 'All results must have province ปทุมธานี');

    const resPhuket = autocomplete.search('ภูเก็ต', 'province', 10);
    assert.ok(resPhuket.length > 0, 'Must find results for ภูเก็ต');
    assert.ok(resPhuket.every(item => item.province === 'ภูเก็ต'), 'All results must have province ภูเก็ต');
  });
});
