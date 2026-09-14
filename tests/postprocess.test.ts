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
  assert.deepEqual(out.items[0]?.reviewReasons, ['blocked'])
})

test('같은 회의록을 다시 넣으면 id가 같다', () => {
  const raw = fake([item({ content: '토너 발주', quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.' })])
  const a = postprocess(raw, SOURCE, '2026-09-13')
  const b = postprocess(raw, SOURCE, '2026-09-13')
  assert.equal(a.items[0]?.id, b.items[0]?.id)
})
