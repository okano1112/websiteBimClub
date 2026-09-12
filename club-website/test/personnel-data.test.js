const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '../database/phase10-current-team.sql'), 'utf8');
const honorMigration = fs.readFileSync(path.join(__dirname, '../database/phase11-honor-generation1-2024.sql'), 'utf8');
const expected = [
    'นายศุภกิตติ์ เจริญสุข', 'นายสมชาย ตอล', 'นายไกรศร วิเชียรสาร', 'นายพชรพล ศรีคงแก้ว',
    'นายกฤษกร เทพชัย', 'นายพีระพงศ์ ชัยเพ็ชร', 'นางสาวนิชกาณต์ เลื่อนลอย', 'นางสาวพิชญา ชัยวิเศษ',
    'นายกริชติพัฒน์ ถนัดค้า', 'นางสาวศศิวิมล เรืองนิล', 'ศุภวิชญ์ แถลงกัณฑ์', 'กฤตัชญ์ ศรีวรรณะ'
];

test('Generation 1 seed contains exactly the supplied 12 names in order', () => {
    const names = [...migration.matchAll(/SELECT '([^']+)'(?: AS full_name)?(?:, (\d+))?/g)].map((match) => match[1]);
    assert.deepEqual(names, expected);
    assert.match(migration, /'2024'/);
    assert.equal(names.length, 12);
});

test('Generation 1 roster is also seeded into the 2024 Hall of Fame', () => {
    const names = [...honorMigration.matchAll(/SELECT '([^']+)'(?: AS full_name)?(?:, (\d+))?/g)].map((match) => match[1]);
    assert.deepEqual(names, expected);
    assert.match(honorMigration, /'รุ่น 1'/);
    assert.match(honorMigration, /'2024'/);
});
