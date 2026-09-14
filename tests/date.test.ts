import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAbsolute, parseRelative, parseBackward, parseDue } from '../lib/date.ts'

const MEETING = '2026-09-13' // 일요일

test('절대 날짜 — 11월 2일', () => {
  assert.equal(parseAbsolute('11월 2일', MEETING), '2026-11-02')
  assert.equal(parseAbsolute('11/2', MEETING), '2026-11-02')
  assert.equal(parseAbsolute('2026-11-02', MEETING), '2026-11-02')
})

test('절대 날짜 — 회의일보다 한참 과거면 다음 해로 본다', () => {
  assert.equal(parseAbsolute('1월 5일', MEETING), '2027-01-05')
})

test('상대 날짜 — 내일/모레', () => {
  assert.equal(parseRelative('내일', MEETING), '2026-09-14')
  assert.equal(parseRelative('모레까지', MEETING), '2026-09-15')
})

test('상대 날짜 — 주 시작은 월요일', () => {
  // 2026-09-13은 일요일 → 그 주 월요일은 09-07
  assert.equal(parseRelative('이번 주 수요일', MEETING), '2026-09-09')
  assert.equal(parseRelative('다음 주 수요일', MEETING), '2026-09-16')
  assert.equal(parseRelative('담주 화요일', MEETING), '2026-09-15')
})

test('상대 날짜 — 이번 달 안에 = 월말', () => {
  assert.equal(parseRelative('이번 달 안에', MEETING), '2026-09-30')
})

test('상대 날짜 — N일 뒤', () => {
  assert.equal(parseRelative('3일 뒤', MEETING), '2026-09-16')
  assert.equal(parseRelative('2주 후', MEETING), '2026-09-27')
})

test('역산 — 만료 30일 전', () => {
  assert.equal(parseBackward('만료 30일 전', '2026-11-02'), '2026-10-03')
})

test('역산 — anchor가 없으면 못 한다', () => {
  assert.equal(parseBackward('만료 30일 전', null), null)
})

test('parseDue — 샘플 05 커피머신 (역산)', () => {
  assert.deepEqual(parseDue('만료 30일 전', '11월 2일', MEETING), {
    due: '2026-10-03',
    anchor: '2026-11-02',
    method: 'backward',
    unparseable: false,
  })
})

test('parseDue — 기한이 없으면 unparseable이 아니다', () => {
  const result = parseDue(null, null, MEETING)
  assert.equal(result.due, null)
  assert.equal(result.unparseable, false)
  assert.equal(result.method, 'none')
})

test('parseDue — 환산 불가는 감추지 않고 올린다', () => {
  assert.equal(parseDue('여유 될 때', null, MEETING).unparseable, true)
  assert.equal(parseDue('다음 회의 전까지', null, MEETING).unparseable, true)
})

test('parseDue — 회의 날짜가 없으면 상대 표현은 환산 불가', () => {
  assert.equal(parseDue('담주 화요일', null, null).unparseable, true)
})
