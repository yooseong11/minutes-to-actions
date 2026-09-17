import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMarkdown } from '../lib/export-markdown.js'
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
  attendees: [{ nameRaw: '최영호', contextRaw: null }],
  agendas: [{ id: 'a1', title: '비품 발주', summary: '토너 재고가 떨어져 발주하기로 했다.' }],
  items: [item()],
  rejected: [],
  ...over,
})

test('화면과 같은 순서로 나온다 — 참석자 → TPO → 안건', () => {
  const md = toMarkdown(meeting())
  const order = ['## 참석자', '## TPO', '## 안건'].map((h) => md.indexOf(h))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  assert.ok(order.every((i) => i >= 0), '세 제목이 모두 있어야 한다')
})

test('빈 칸도 제목을 남긴다 — 값이 없다고 줄을 지우지 않는다', () => {
  const md = toMarkdown(meeting({ meetingPlaceRaw: null, purposeRaw: null }))
  assert.match(md, /- 장소: 원문에 없음/)
  assert.match(md, /- 목적: 원문에 없음/)
})

test('라벨은 labels.ts를 쓴다 — 코드값이 그대로 나가지 않는다', () => {
  const md = toMarkdown(meeting({ items: [item({ reviewReasons: ['no_assignee'] })] }))
  assert.match(md, /담당자 필요/)
  assert.doesNotMatch(md, /no_assignee/)
})

test('번복된 항목은 배지가 아니라 취소선', () => {
  const md = toMarkdown(meeting({
    items: [item({ type: 'decision', content: '연장한다', reviewReasons: ['superseded'] })],
  }))
  assert.match(md, /~~연장한다~~/)
})

test('담당자 미정인 할 일은 빈칸이 아니라 "담당자 미정"', () => {
  const md = toMarkdown(meeting())
  assert.match(md, /담당자 미정/)
})

test('참석자의 소속은 괄호로 붙는다 — 동명이인 구분', () => {
  const md = toMarkdown(meeting({ attendees: [{ nameRaw: '김철수', contextRaw: '회계' }] }))
  assert.match(md, /- 김철수\(회계\)/)
})

test('안건이 없어도 제목과 안내는 남는다', () => {
  const md = toMarkdown(meeting({ agendas: [], items: [] }))
  assert.match(md, /## 안건/)
  assert.match(md, /본문에서 안건을 찾지 못했습니다/)
})

test('항목이 빈 안건도 지우지 않는다', () => {
  const md = toMarkdown(meeting({ items: [] }))
  assert.match(md, /### 1\. 비품 발주/)
  assert.match(md, /이 안건에 남은 항목이 없습니다/)
})

test('안건 제목·요약이 검증 안 된 칸이라는 경고가 문서에도 남는다', () => {
  assert.match(toMarkdown(meeting()), /확인이 필요합니다/)
})

test('기본값에서는 항목별 인용문과 원문 전문을 표시하지 않는다', () => {
  const md = toMarkdown(meeting({ items: [item({ quote: '토너 떨어졌어요' })] }))
  assert.doesNotMatch(md, /> 토너 떨어졌어요/)
  assert.doesNotMatch(md, /## 회의록 원문/)
})

test('원문 표시를 고르면 한 줄 인용문과 원문 전문을 함께 붙인다', () => {
  const md = toMarkdown(
    meeting({ items: [item({ quote: '토너가\n떨어졌어요' })] }),
    { includeSource: true, sourceText: '회의 시작\n토너가 떨어졌어요\n회의 끝' },
  )
  assert.match(md, /> 토너가 떨어졌어요/)
  assert.doesNotMatch(md, /> 토너가\n떨어졌어요/)
  assert.match(md, /## 회의록 원문\n\n```text\n회의 시작\n토너가 떨어졌어요\n회의 끝\n```/)
})

test('원문 전문의 연속 빈 줄을 그대로 보존한다', () => {
  const sourceText = '첫 문단\n\n\n둘째 문단'
  const md = toMarkdown(meeting(), { includeSource: true, sourceText })
  assert.match(md, /```text\n첫 문단\n\n\n둘째 문단\n```/)
})

test('안건 안에서 결정 → 할 일 → 미결 순으로 정렬된다', () => {
  const md = toMarkdown(meeting({
    items: [
      item({ id: 'i1', type: 'open', content: '미결건' }),
      item({ id: 'i2', type: 'decision', content: '결정건' }),
      item({ id: 'i3', type: 'action', content: '할일건' }),
    ],
  }))
  assert.ok(md.indexOf('결정건') < md.indexOf('할일건'))
  assert.ok(md.indexOf('할일건') < md.indexOf('미결건'))
})

test('기한은 코드가 환산한 값을 쓴다', () => {
  const md = toMarkdown(meeting({ items: [item({ dueDateRaw: '담주 화', due: '2026-09-22' })] }))
  assert.match(md, /\(기한: 2026-09-22\)/)
  assert.doesNotMatch(md, /담주 화/)
})

test('빈 줄이 세 줄 이상 이어지지 않는다 — 노션 붙여넣기', () => {
  assert.doesNotMatch(toMarkdown(meeting()), /\n{3}/)
})
