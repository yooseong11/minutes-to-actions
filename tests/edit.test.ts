import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createItem, deleteAgenda, editAgenda, editItem, editMeetingTpo, recalculateMeeting } from '../lib/edit.js'
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
  const item = createItem('manual-1', 'ag-1', 'action', '우산꽂이 구매 검토', null, null)
  assert.equal(item.userCreated, true)
  assert.equal(item.quote, '')
  assert.equal(item.original, undefined)
  assert.deepEqual(item.reviewReasons, ['no_assignee'])
  assert.throws(() => createItem('manual-2', 'ag-1', 'open', '  ', null, null))
  assert.throws(() => editItem(candidate, { content: '  ' }))
})

test('TPO 수정은 공백을 정리하고 최초 추출값을 보존한다', () => {
  const result = editMeetingTpo(SAMPLE_01, {
    meetingDate: SAMPLE_01.meetingDate,
    meetingTimeRaw: ' 오전 10시 ',
    meetingPlaceRaw: '   ',
    purposeRaw: SAMPLE_01.purposeRaw,
  })

  assert.equal(result.meetingTimeRaw, '오전 10시')
  assert.equal(result.meetingPlaceRaw, null)
  assert.deepEqual(result.editedTpoFields, ['meetingTimeRaw', 'meetingPlaceRaw'])
  assert.deepEqual(result.originalTpo, {
    meetingDate: SAMPLE_01.meetingDate,
    meetingDateSource: SAMPLE_01.meetingDateSource,
    meetingTimeRaw: SAMPLE_01.meetingTimeRaw,
    meetingPlaceRaw: SAMPLE_01.meetingPlaceRaw,
    purposeRaw: SAMPLE_01.purposeRaw,
  })
})

test('TPO 날짜 변경은 자동 기한만 다시 계산하고 직접 수정한 기한은 유지한다', () => {
  const manual = editItem(candidate, { due: '2026-10-01' })
  const meeting = { ...SAMPLE_01, items: [candidate, manual] }
  const result = editMeetingTpo(meeting, {
    meetingDate: '2026-09-21',
    meetingTimeRaw: meeting.meetingTimeRaw,
    meetingPlaceRaw: meeting.meetingPlaceRaw,
    purposeRaw: meeting.purposeRaw,
  })

  assert.equal(result.meetingDateSource, 'user')
  assert.notEqual(result.items[0].due, candidate.due)
  assert.equal(result.items[1].due, '2026-10-01')
  assert.deepEqual(result.editedTpoFields, ['meetingDate'])
})

test('TPO에 변경이 없으면 새 편집 이력을 만들지 않는다', () => {
  const result = editMeetingTpo(SAMPLE_01, {
    meetingDate: SAMPLE_01.meetingDate,
    meetingTimeRaw: SAMPLE_01.meetingTimeRaw,
    meetingPlaceRaw: SAMPLE_01.meetingPlaceRaw,
    purposeRaw: SAMPLE_01.purposeRaw,
  })
  assert.equal(result, SAMPLE_01)
})

test('안건 수정은 공백을 정리하고 최초 AI 결과를 보존한다', () => {
  const source = SAMPLE_01.agendas[0]
  const first = editAgenda(SAMPLE_01, source.id, {
    title: '  새 안건 제목  ',
    summary: '   ',
  })
  const edited = first.agendas[0]

  assert.equal(edited.title, '새 안건 제목')
  assert.equal(edited.summary, null)
  assert.equal(edited.original, source)
  assert.deepEqual(edited.editedFields, ['title', 'summary'])

  const second = editAgenda(first, source.id, { title: '두 번째 제목', summary: '새 요약' })
  assert.equal(second.agendas[0].original, source)
  assert.deepEqual(second.agendas[0].editedFields, ['title', 'summary'])
  assert.throws(() => editAgenda(SAMPLE_01, source.id, { title: '  ', summary: null }))
})

test('안건 삭제는 소속 항목만 함께 지우고 다른 안건은 보존한다', () => {
  const target = SAMPLE_01.agendas[0]
  const otherAgendaIds = SAMPLE_01.agendas.slice(1).map(agenda => agenda.id)
  const result = deleteAgenda(SAMPLE_01, target.id)

  assert.deepEqual(result.agendas.map(agenda => agenda.id), otherAgendaIds)
  assert.ok(result.items.every(item => item.agendaId !== target.id))
  assert.deepEqual(
    result.items,
    SAMPLE_01.items.filter(item => item.agendaId !== target.id),
  )
})
