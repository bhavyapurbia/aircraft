const test = require('node:test');
const assert = require('node:assert');
const { pool } = require('../src/config/db');
const { validateActivity } = require('../src/services/conflictEngine');

test.after(async () => {
  await pool.end();
});

test('Conflict Detection: should reject end time before start time', async () => {
  const result = await validateActivity({
    title: 'Faulty Mission Time',
    start_time: '2026-10-15 14:00:00',
    end_time: '2026-10-15 10:00:00',
    resource_id: 1
  });

  const durationError = result.find((c) => c.conflict_type === 'INVALID_DURATION');
  assert.ok(durationError, 'Should flag INVALID_DURATION');
  assert.strictEqual(durationError.severity, 'Critical Error');
});

test('Conflict Detection: should reject missing mandatory parameters', async () => {
  const result = await validateActivity({
    title: 'Incomplete Mission'
  });

  const paramError = result.find((c) => c.conflict_type === 'INVALID_PARAMETERS');
  assert.ok(paramError, 'Should flag INVALID_PARAMETERS');
});

test('Conflict Detection: should detect overlapping activities on same aircraft', async () => {
  // Activity 4 runs from 2026-10-10 07:00:00 to 2026-10-10 12:00:00 on resource 2
  const result = await validateActivity({
    title: 'Test Overlap Sortie',
    start_time: '2026-10-10 08:00:00',
    end_time: '2026-10-10 11:00:00',
    resource_id: 2
  });

  const overlap = result.find((c) => c.conflict_type === 'RESOURCE_OVERLAP');
  assert.ok(overlap, 'Should detect RESOURCE_OVERLAP with Activity 4');
  assert.strictEqual(overlap.conflicting_activity_id, 4);
});

test('Conflict Detection: should detect collision with scheduled maintenance window', async () => {
  // Resource 5 has maintenance MNT-2026-001 from 2026-10-08 08:00 to 2026-10-11 18:00
  const result = await validateActivity({
    title: 'Test Flight During Maintenance',
    start_time: '2026-10-10 10:00:00',
    end_time: '2026-10-10 14:00:00',
    resource_id: 5
  });

  const maintConflict = result.find((c) => c.conflict_type === 'MAINTENANCE_COLLISION');
  assert.ok(maintConflict, 'Should detect MAINTENANCE_COLLISION');
  assert.strictEqual(maintConflict.conflicting_maintenance_id, 1);
});

test('Conflict Detection: should flag staff double-booking', async () => {
  // Capt. Aarav Sharma (STF-001, id: 1) is booked on Activity 7 (2026-10-12 08:00:00 to 14:30:00)
  const result = await validateActivity({
    title: 'Second Concurrent Mission',
    start_time: '2026-10-12 09:00:00',
    end_time: '2026-10-12 13:00:00',
    resource_id: 7, // King Air (no aircraft collision)
    staff_ids: [1]
  });

  const staffConflict = result.find((c) => c.conflict_type === 'STAFF_DOUBLE_BOOKED');
  assert.ok(staffConflict, 'Should flag STAFF_DOUBLE_BOOKED for Capt. Aarav');
  assert.strictEqual(staffConflict.conflicting_staff_id, 1);
});

test('Conflict Detection: should flag expired qualifications', async () => {
  // Capt. Priya Nair (id: 2) has expired qualification id: 4 ('Heavy Turboprop Captain Certification')
  const result = await validateActivity({
    title: 'Flight With Expired Qualification Requirement',
    start_time: '2026-10-20 09:00:00',
    end_time: '2026-10-20 12:00:00',
    resource_id: 7,
    staff_ids: [2],
    required_qualification: 'Heavy Turboprop Captain Certification'
  });

  const qualConflict = result.find((c) => c.conflict_type === 'EXPIRED_QUALIFICATION');
  assert.ok(qualConflict, 'Should flag EXPIRED_QUALIFICATION');
});
