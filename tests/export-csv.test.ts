import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CSV_HEADERS, csvFileName, toCsv } from '../lib/export-csv.js'
import type { ProcessedItem, ProcessedMeeting } from '../lib/postprocess.js'

const item = (over: Partial<ProcessedItem> = {}): ProcessedItem => ({
  id: 'i1',
  agendaId: 'a1',
  type: 'action',
  content: '토너 발주',
  assigneeRaw: null,
  assigneeContextRaw: null,
  dueDateRaw: null,
  anchorDateRaw: null,
  blockedByRaw: null,
  reviewReasons: [],
  quote: '',
  supersededQuote: null,
  due: null,
  dueAnchor: null,
  dueMethod: 'none',
  assignee: null,
  assigneeCandidates: [],
  preselect: false,
  confidence: 'high',
  ...over,
})

const meeting = (over: Partial<ProcessedMeeting> = {}): ProcessedMeeting => ({
  meetingDate: '2026-09-13',
  meetingDateRaw: '9/13 금',
  meetingDateSource: 'document',
  meetingTimeRaw: '오전 10시',
  meetingPlaceRaw: '대회의실',
  purposeRaw: '주간 업무회의',
  attendees: [],
  agendas: [{ id: 'a1', title: '비품 발주', summary: null }],
  items: [item()],
  rejected: [],
  ...over,
})

/** BOM을 떼고 CRLF로 자른 줄 배열 */
const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n')

test('엑셀이 한글을 깨지 않도록 BOM으로 시작한다', () => {
  assert.ok(toCsv(meeting()).startsWith('﻿'))
})

test('줄바꿈은 CRLF다 (RFC 4180)', () => {
  assert.match(toCsv(meeting()), /\r\n/)
})

test('첫 줄은 헤더고 컬럼 순서가 고정돼 있다', () => {
  assert.equal(lines(toCsv(meeting()))[0], CSV_HEADERS.join(','))
})

test('한 항목이 한 줄이다 — 안건은 컬럼으로 내려온다', () => {
  const csv = toCsv(meeting({
    items: [item({ id: 'i1' }), item({ id: 'i2', content: '견적 받기' })],
  }))
  assert.equal(lines(csv).length, 3)
  assert.ok(lines(csv).every((l, i) => i === 0 || l.includes('비품 발주')))
})

test('전체 항목이 들어간다 — 결정·미결도 빠지지 않는다', () => {
  const csv = toCsv(meeting({
    items: [
      item({ id: 'i1', type: 'decision', content: '결정건' }),
      item({ id: 'i2', type: 'open', content: '미결건' }),
      item({ id: 'i3', type: 'action', content: '할일건' }),
    ],
  }))
  assert.equal(lines(csv).length, 4)
  for (const label of ['결정', '미결', '할 일']) assert.ok(csv.includes(label))
})

test('쉼표가 든 값은 따옴표로 감싼다 — 셀이 갈라지면 안 된다', () => {
  const csv = toCsv(meeting({ items: [item({ content: 'A사 3천, B사 4천2백' })] }))
  assert.ok(csv.includes('"A사 3천, B사 4천2백"'))
})

test('따옴표는 두 번 써서 이스케이프한다', () => {
  const csv = toCsv(meeting({ items: [item({ quote: '최영호: "지금 거 자주 고장나요"' })] }))
  assert.ok(csv.includes('"최영호: ""지금 거 자주 고장나요"""'))
})

test('셀 안의 줄바꿈은 셀을 깨지 않는다', () => {
  const csv = toCsv(meeting({ items: [item({ content: '첫 줄\n둘째 줄' })] }))
  assert.ok(csv.includes('"첫 줄\n둘째 줄"'))
  assert.equal(lines(csv).length, 2)
})

test('검토 사유는 라벨로 나가고 여러 개면 세미콜론으로 잇는다', () => {
  const csv = toCsv(meeting({ items: [item({ reviewReasons: ['no_assignee', 'conditional'] })] }))
  assert.ok(csv.includes('담당자 필요; 조건부'))
  assert.doesNotMatch(csv, /no_assignee/)
})

test('담당자 없는 할 일은 빈칸이 아니라 "담당자 미정"', () => {
  assert.ok(toCsv(meeting()).includes('담당자 미정'))
})

test('담당자 없는 미결은 빈칸으로 둔다 — 원래 담당자가 없는 분류다', () => {
  const csv = toCsv(meeting({ items: [item({ type: 'open', content: '미결건' })] }))
  assert.doesNotMatch(csv, /담당자 미정/)
})

test('기한은 코드가 환산한 값을 쓴다', () => {
  const csv = toCsv(meeting({ items: [item({ dueDateRaw: '담주 화', due: '2026-09-22' })] }))
  assert.ok(csv.includes('2026-09-22'))
  assert.doesNotMatch(csv, /담주 화/)
})

test('환산에 실패하면 원문 표현이라도 남긴다 — 빈칸으로 두지 않는다', () => {
  const csv = toCsv(meeting({ items: [item({ dueDateRaw: '조만간', due: null })] }))
  assert.ok(csv.includes('조만간'))
})

test('항목이 없으면 헤더만 나온다', () => {
  assert.equal(lines(toCsv(meeting({ items: [] }))).length, 1)
})

test('파일 이름에 회의 날짜가 들어간다', () => {
  assert.equal(csvFileName(meeting()), '회의록_항목_2026-09-13.csv')
  assert.equal(csvFileName(meeting({ meetingDate: null })), '회의록_항목_날짜미상.csv')
})
