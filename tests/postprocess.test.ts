import { test } from 'node:test'
import assert from 'node:assert/strict'
import { postprocess } from '../lib/postprocess.js'
import type { RawExtraction, RawItem } from '../lib/types.js'

// 실제 샘플 05 원문 일부
const SOURCE = `비품/총무 건 (9/13 금 오전 짧게)
참석: 이수현, 최영호, 정다은

1. 프린터 토너 재고 소진 임박 → 발주. 최영호.
5. 탕비실 커피머신 렌탈 계약 — 자동갱신이라 해지하려면 만료 30일 전에
   통보해야 함. 만료가 11월 2일.`

const item = (over: Partial<RawItem>): RawItem => ({
  type: 'action',
  content: '',
  assigneeRaw: null,
  assigneeContextRaw: null,
  dueDateRaw: null,
  anchorDateRaw: null,
  blockedByRaw: null,
  reviewReasons: [],
  quote: '',
  supersededQuote: null,
  ...over,
})

// LLM 호출 없이, 가짜 AI 응답으로 후처리만 검증한다
const fake = (items: RawItem[]): RawExtraction => ({
  meetingDateRaw: '9/13 금',
  attendeesRaw: [
    { nameRaw: '이수현', contextRaw: null },
    { nameRaw: '최영호', contextRaw: null },
    { nameRaw: '정다은', contextRaw: null },
  ],
  items,
})

test('커피머신 — 역산 결과와 no_assignee가 같이 나온다', () => {
  const out = postprocess(
    fake([
      item({
        type: 'action',
        content: '커피머신 렌탈 계약 해지 통보',
        dueDateRaw: '만료 30일 전',
        anchorDateRaw: '11월 2일',
        reviewReasons: ['no_assignee'],
        quote: '만료가 11월 2일.',
      }),
    ]),
    SOURCE,
    '2026-09-13',
  )

  const coffee = out.items[0]
  assert.equal(coffee?.due, '2026-10-03')
  assert.equal(coffee?.dueAnchor, '2026-11-02')
  assert.equal(coffee?.dueMethod, 'backward')
  assert.deepEqual(coffee?.reviewReasons, ['no_assignee'])
  assert.equal(coffee?.confidence, 'needs_review')
})

test('사유가 하나도 없으면 confidence는 high', () => {
  const out = postprocess(
    fake([item({ content: '토너 발주', assigneeRaw: '최영호', quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items[0]?.confidence, 'high')
  assert.equal(out.items[0]?.assignee?.nameRaw, '최영호')
})

test('환각 항목은 items에 들어가지 않고 rejected로 빠진다', () => {
  const out = postprocess(
    fake([item({ content: '지어낸 항목', quote: '원문에 없는 문장입니다' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items.length, 0)
  assert.equal(out.rejected.length, 1)
})

test('선행조건이 있으면 blocked가 붙는다', () => {
  const out = postprocess(
    fake([item({ content: '계약서 초안 검토', blockedByRaw: '업체 확정', quote: '만료가 11월 2일.' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.deepEqual(out.items[0]?.reviewReasons, ['no_assignee', 'blocked'])
})

test('같은 회의록을 다시 넣으면 id가 같다', () => {
  const raw = fake([item({ content: '토너 발주', quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.' })])
  const a = postprocess(raw, SOURCE, '2026-09-13')
  const b = postprocess(raw, SOURCE, '2026-09-13')
  assert.equal(a.items[0]?.id, b.items[0]?.id)
})

// --- 코드로 옮긴 판정 ---

test('담당자가 인용문 안에 없으면 AI가 추론한 것이므로 비운다', () => {
  const out = postprocess(
    fake([
      item({
        content: '워크샵 장소 후보 뽑기',
        assigneeRaw: '이수현', // 다른 발화에서 끌어온 이름
        quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.',
      }),
    ]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items[0]?.assigneeRaw, null)
  assert.equal(out.items[0]?.assignee, null)
  assert.ok(out.items[0]?.reviewReasons.includes('no_assignee'))
})

test('1인칭 담당자는 assignee_unknown', () => {
  const out = postprocess(
    fake([item({ assigneeRaw: '내가', quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.ok(out.items[0]?.reviewReasons.includes('assignee_unknown'))
  assert.equal(out.items[0]?.assignee, null)
})

test('AI가 붙인 due_unparseable은 코드가 환산에 성공하면 떼어낸다', () => {
  const out = postprocess(
    fake([
      item({
        dueDateRaw: '만료 30일 전',
        anchorDateRaw: '11월 2일',
        reviewReasons: ['due_unparseable'],
        assigneeRaw: '최영호',
        quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.',
      }),
    ]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items[0]?.due, '2026-10-03')
  assert.equal(out.items[0]?.reviewReasons.includes('due_unparseable'), false)
})

test('단위 없는 금액은 unit_unclear', () => {
  const out = postprocess(
    fake([item({ content: 'A사 3천, B사 4천2백', quote: '만료가 11월 2일.' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.ok(out.items[0]?.reviewReasons.includes('unit_unclear'))
})

test('단위가 붙어 있으면 unit_unclear가 아니다', () => {
  const out = postprocess(
    fake([item({ content: '차액이 월 10만원 이내면 변경', quote: '만료가 11월 2일.' })]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items[0]?.reviewReasons.includes('unit_unclear'), false)
})

test('번복된 결정은 항목 하나로 접힌다', () => {
  const out = postprocess(
    fake([
      item({ type: 'decision', content: 'A사로 결정', quote: '만료가 11월 2일.' }),
      item({
        type: 'open',
        content: '다시 원점',
        quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.',
        supersededQuote: '만료가 11월 2일.',
      }),
    ]),
    SOURCE,
    '2026-09-13',
  )
  assert.equal(out.items.length, 1)
  assert.equal(out.items[0]?.type, 'open')
  assert.ok(out.items[0]?.reviewReasons.includes('superseded'))
})
