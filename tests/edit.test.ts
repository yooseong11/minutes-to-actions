import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createItem, editItem, recalculateMeeting } from '../lib/edit.js'
import { SAMPLE_01 } from '../src/fixtures/sample01.js'

const candidate = SAMPLE_01.items.find(item => item.assigneeCandidates.length > 0)!

test('담당자 확정은 담당자 문제만 해결하고 추출 원본과 다른 경고를 보존한다', () => {
  const source = { ...candidate, reviewReasons: [...candidate.reviewReasons, 'conditional' as const] }
  const snapshot = structuredClone(source)
  const result = editItem(source, { assignee: { nameRaw: '김민수', contextRaw: null } })
  assert.deepEqual(source, snapshot)
  assert.equal(result.quote, source.quote)
  assert.equal(result.original, source)
  assert.deepEqual(result.reviewReasons, ['conditional'])
  assert.equal(result.confidence, 'needs_review')
})

test('담당자 삭제는 할 일만 미지정 상태로 되돌린다', () => {
  const assigned = editItem(candidate, { assignee: { nameRaw: '김민수', contextRaw: null } })
  const cleared = editItem(assigned, { assignee: null })
  assert.equal(cleared.assignee, null)
  assert.deepEqual(cleared.assigneeCandidates, [])
  assert.deepEqual(cleared.reviewReasons, ['no_assignee'])
  assert.equal(cleared.original, candidate)
  assert.ok(!editItem(cleared, { type: 'open' }).reviewReasons.includes('no_assignee'))
})

test('기준일 재계산은 직접 지정하거나 삭제한 기한을 복원하지 않는다', () => {
  const manual = editItem(candidate, { due: '2026-10-01' })
  const cleared = editItem(candidate, { due: null })
  const result = recalculateMeeting({ ...SAMPLE_01, items: [candidate, manual, cleared] }, '2026-09-21')
  assert.notEqual(result.items[0].due, candidate.due)
  assert.equal(result.items[1].due, '2026-10-01')
  assert.equal(result.items[2].due, null)
  assert.equal(result.items[2].dueDateRaw, candidate.dueDateRaw)
})

test('안건을 반복 수정해도 최초 원문과 분류를 보존한다', () => {
  const first = editItem(candidate, { content: '서류 검토 범위 재확인' })
  const next = editItem(first, { type: 'open', content: '서류 검토 범위 논의' })
  assert.equal(next.original, candidate)
  assert.equal(next.quote, candidate.quote)
  assert.equal(next.type, 'open')
  assert.deepEqual(next.editedFields, ['content', 'type'])
})

test('직접 추가한 안건은 가짜 원문을 만들지 않고 빈 내용은 거부한다', () => {
  const item = createItem('manual-1', 'action', '우산꽂이 구매 검토', null, null)
  assert.equal(item.userCreated, true)
  assert.equal(item.quote, '')
  assert.equal(item.original, undefined)
  assert.deepEqual(item.reviewReasons, ['no_assignee'])
  assert.throws(() => createItem('manual-2', 'open', '  ', null, null))
  assert.throws(() => editItem(candidate, { content: '  ' }))
})
