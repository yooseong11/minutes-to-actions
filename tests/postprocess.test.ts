import { test } from 'node:test'
import assert from 'node:assert/strict'
import { postprocess, resolveMeetingDate } from '../lib/postprocess.js'
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
  meetingTimeRaw: '오전 10시',
  meetingPlaceRaw: '대회의실',
  purposeRaw: '주간 업무회의',
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

// --- 기준일 우선순위 (사용자 지정 > 원문 > 오늘) ---
//
// 여기까지 테스트가 없어서 기한이 전부 일주일씩 밀린 채로 44개가 통과했다.
// 원인은 postprocess에 meetingDate를 "항상" 넘겨준 것. 안 넘기는 경우를 만든다.

test('사용자가 날짜를 고르면 원문보다 사용자가 이긴다', () => {
  assert.deepEqual(resolveMeetingDate('2026-09-20', '9/13 금', '2026-09-14'), {
    date: '2026-09-20',
    source: 'user',
  })
})

test('사용자가 안 골랐으면 원문 날짜가 오늘을 이긴다', () => {
  assert.deepEqual(resolveMeetingDate(null, '9/13 금', '2026-09-14'), {
    date: '2026-09-13',
    source: 'document',
  })
})

test('원문에 날짜가 없을 때만 오늘로 내려간다', () => {
  assert.deepEqual(resolveMeetingDate(null, null, '2026-09-14'), {
    date: '2026-09-14',
    source: 'fallback',
  })
})

test('셋 다 없으면 기준일이 없다고 말한다 (조용히 오늘로 때우지 않는다)', () => {
  assert.deepEqual(resolveMeetingDate(null, null, null), { date: null, source: 'none' })
})

test('연도가 적힌 원문 날짜는 오늘의 연도로 덮이지 않는다', () => {
  assert.deepEqual(resolveMeetingDate(null, '2025년 11월 2일', '2026-09-14'), {
    date: '2025-11-02',
    source: 'document',
  })
})

test('화면이 오늘만 보내도 기한은 원문 날짜(9/13) 기준으로 환산된다', () => {
  const out = postprocess(
    fake([
      item({
        content: '견적 취합',
        assigneeRaw: '최영호',
        dueDateRaw: '이번 주 안에',
        quote: '프린터 토너 재고 소진 임박 → 발주. 최영호.',
      }),
    ]),
    SOURCE,
    null, // 사용자는 날짜를 고르지 않았다
    '2026-09-14', // 프론트가 채운 오늘 (일요일)
  )

  assert.equal(out.meetingDate, '2026-09-13')
  assert.equal(out.meetingDateSource, 'document')
  // 오늘(9/14 월) 기준이면 9/20이 나온다. 원문(9/13 일) 기준이면 그 주의 끝인 9/13.
  assert.equal(out.items[0]?.due, '2026-09-13')
})

test('원문 표현은 기준일로 뭘 썼든 그대로 내보낸다', () => {
  const out = postprocess(fake([]), SOURCE, '2026-09-20', '2026-09-14')
  assert.equal(out.meetingDateRaw, '9/13 금')
  assert.equal(out.meetingDate, '2026-09-20')
  assert.equal(out.meetingDateSource, 'user')
})

// --- TPO (시각 · 장소 · 목적) -------------------------------------------------
// 코드가 계산하지 않고 그대로 흘려보내는 칸이다. 검증할 것은 두 가지뿐이다.
//   1) 값이 손상되지 않고 통과하는가
//   2) 빈 값이 화면까지 빈 문자열로 흘러가지 않는가

test('TPO 세 칸은 발췌 그대로 통과한다', () => {
  const out = postprocess(fake([]), SOURCE, null, '2026-09-14')
  assert.equal(out.meetingTimeRaw, '오전 10시')
  assert.equal(out.meetingPlaceRaw, '대회의실')
  assert.equal(out.purposeRaw, '주간 업무회의')
})

test('TPO — 기준일을 사용자가 고쳐도 셋은 영향받지 않는다', () => {
  const out = postprocess(fake([]), SOURCE, '2026-09-20', '2026-09-14')
  assert.equal(out.meetingDateSource, 'user')
  assert.equal(out.meetingTimeRaw, '오전 10시')
  assert.equal(out.meetingPlaceRaw, '대회의실')
})

test('TPO — 빈 문자열과 공백은 null로 접힌다', () => {
  const raw = { ...fake([]), meetingTimeRaw: '', meetingPlaceRaw: '   ', purposeRaw: null }
  const out = postprocess(raw, SOURCE, null, '2026-09-14')
  // 빈 문자열이 그대로 통과하면 화면이 "원문에 없음" 대신 빈 칸을 그린다
  assert.equal(out.meetingTimeRaw, null)
  assert.equal(out.meetingPlaceRaw, null)
  assert.equal(out.purposeRaw, null)
})

test('TPO — 앞뒤 공백은 다듬는다', () => {
  const raw = { ...fake([]), meetingPlaceRaw: '  3층 소회의실  ' }
  const out = postprocess(raw, SOURCE, null, '2026-09-14')
  assert.equal(out.meetingPlaceRaw, '3층 소회의실')
})
