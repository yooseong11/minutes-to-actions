import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quoteExists, verifyItemQuotes, verifyItems } from '../lib/verify'
import type { RawItem } from '../lib/types'

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

test('원문에 있는 인용문은 통과한다', () => {
  assert.equal(quoteExists('프린터 토너 재고 소진 임박 → 발주. 최영호.', SOURCE), true)
})

test('줄바꿈으로 갈린 인용문도 통과한다', () => {
  assert.equal(quoteExists('자동갱신이라 해지하려면 만료 30일 전에 통보해야 함.', SOURCE), true)
})

test('지어낸 인용문은 걸린다', () => {
  assert.equal(quoteExists('최영호 님이 토너를 다음 주까지 발주하기로 했습니다.', SOURCE), false)
})

test('요약·윤문된 인용문은 걸린다', () => {
  assert.equal(quoteExists('프린터 토너를 발주한다', SOURCE), false)
})

test('빈 인용문은 통과시키지 않는다', () => {
  assert.equal(quoteExists('', SOURCE), false)
  assert.equal(quoteExists(null, SOURCE), false)
})

test('supersededQuote도 같은 검사를 받는다', () => {
  const result = verifyItemQuotes(
    item({ quote: '만료가 11월 2일.', supersededQuote: '앞에서 유지하기로 했었음' }),
    SOURCE,
  )
  assert.deepEqual(result, { ok: false, hallucinated: ['supersededQuote'] })
})

test('supersededQuote가 null이면 검사 대상이 아니다', () => {
  assert.equal(verifyItemQuotes(item({ quote: '만료가 11월 2일.' }), SOURCE).ok, true)
})

test('탈락한 항목은 버리지 않고 rejected로 돌려준다', () => {
  const { verified, rejected } = verifyItems(
    [item({ quote: '만료가 11월 2일.' }), item({ quote: '없는 문장입니다' })],
    SOURCE,
  )
  assert.equal(verified.length, 1)
  assert.equal(rejected.length, 1)
  assert.deepEqual(rejected[0].hallucinated, ['quote'])
})
