import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicateNames, matchAssignee, normalizeName, shouldPreselect } from '../lib/people.js'
import type { RawAttendee } from '../lib/types.js'

const a = (nameRaw: string, contextRaw: string | null = null): RawAttendee => ({ nameRaw, contextRaw })

// 샘플 01
const SAMPLE_01 = [a('박팀장'), a('김민수'), a('이수현'), a('정다은'), a('최영호')]
// 샘플 02 — 김민수가 둘
const SAMPLE_02 = [a('박팀장', '경영지원'), a('김민수', '회계'), a('김민수', '개발팀')]

test('정규화 — 직함과 호칭을 뗀다', () => {
  assert.equal(normalizeName('김 대리'), '김')
  assert.equal(normalizeName('박팀장'), '박')
  assert.equal(normalizeName('최영호 님'), '최영호')
  assert.equal(normalizeName('김민수'), '김민수')
  assert.equal(normalizeName('팀장님'), '')
})

test('이름이 정확히 맞으면 확정한다', () => {
  const m = matchAssignee('최영호', null, SAMPLE_01)
  assert.equal(m.assignee?.nameRaw, '최영호')
  assert.deepEqual(m.reasons, [])
})

test('샘플 01 — "김 대리"는 후보 1명이므로 미리 선택한다 (확정은 아님)', () => {
  const m = matchAssignee('김 대리', null, SAMPLE_01)
  assert.equal(m.assignee, null)
  assert.deepEqual(m.candidates.map((c) => c.nameRaw), ['김민수'])
  assert.deepEqual(m.reasons, ['assignee_unmatched'])
  assert.equal(shouldPreselect(m), true)
})

test('샘플 02 — 동명이인은 아무것도 선택하지 않는다', () => {
  const m = matchAssignee('김민수', null, SAMPLE_02)
  assert.equal(m.assignee, null)
  assert.equal(m.candidates.length, 2)
  assert.deepEqual(m.reasons, ['duplicate_name'])
  assert.equal(shouldPreselect(m), false)
})

test('샘플 02 — 소속이 적혀 있으면 동명이인도 갈린다', () => {
  const m = matchAssignee('김민수', '회계', SAMPLE_02)
  assert.equal(m.assignee?.contextRaw, '회계')
  assert.deepEqual(m.reasons, ['duplicate_name'])
})

test('샘플 03 — 참석자 목록에 없으면 후보 없이 대조 실패', () => {
  const m = matchAssignee('팀장님', null, [])
  assert.equal(m.assignee, null)
  assert.deepEqual(m.candidates, [])
})

test('담당자가 없으면 아무 사유도 붙이지 않는다 (AI가 no_assignee를 이미 넣음)', () => {
  const m = matchAssignee(null, null, SAMPLE_01)
  assert.deepEqual(m, { assignee: null, candidates: [], reasons: [] })
})

test('동명이인 탐지는 참석자 목록 전체를 본다', () => {
  assert.deepEqual([...findDuplicateNames(SAMPLE_02)], ['김민수'])
  assert.deepEqual([...findDuplicateNames(SAMPLE_01)], [])
})
