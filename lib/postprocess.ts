/**
 * 후처리 조립. AI 응답을 받아 코드가 검사·계산·대조한 결과로 바꾼다.
 *
 * 순서 (00_인수인계.md 기준)
 *   0) 안건 안의 항목을 평면으로 펼치고 소속(agendaId)을 기억
 *   1) quote / supersededQuote 환각 탐지
 *   2) parseDue — 상대날짜·역산.  실패하면 due_unparseable 승격
 *   3) assigneeRaw를 attendeesRaw와 대조. 실패하면 assignee_unmatched 승격
 *   4) 후보 제안 — 1명일 때만 미리 선택
 *   5) 같은 이름이 2명 이상이면 duplicate_name 승격
 *   6) confidence 파생
 *
 * 순수 함수. LLM 호출 없음.
 */
import { parseAbsolute, parseDue, toEpoch, type DueMethod } from './date.js'
import {
  assigneeInQuote,
  findDuplicateNames,
  hasUnclearAmount,
  isFirstPerson,
  matchAssignee,
  normalizeName,
  shouldPreselect,
} from './people.js'
import { verifyItems, type RejectedItem } from './verify.js'
import type { Confidence, DateKey, RawAgenda, RawAttendee, RawExtraction, RawItem, ReviewReason } from './types.js'

export interface ProcessedItem extends RawItem {
  /** 회의 안에서 안정적인 id. 나중에 DB를 붙일 때 그대로 쓴다 */
  id: string
  /** 이 항목이 속한 안건. 항목 배열은 평면으로 두고 소속만 들고 다닌다 */
  agendaId: string
  /** 코드가 계산한 실제 기한 */
  due: DateKey | null
  dueAnchor: DateKey | null
  dueMethod: DueMethod
  /** 확정된 담당자. 확정 못 하면 null이고 후보를 띄운다 */
  assignee: RawAttendee | null
  assigneeCandidates: RawAttendee[]
  /** 후보를 미리 선택해 띄울지 (후보 1명일 때만) */
  preselect: boolean
  confidence: Confidence
}

/** 기준일을 어디서 가져왔는가. 화면이 문구를 갈라 쓴다 */
export type MeetingDateSource = 'user' | 'document' | 'fallback' | 'none'

/**
 * 안건 하나. **항목을 품지 않는다. 제목과 요약뿐이다.**
 *
 * 항목을 안건 안에 중첩하지 않은 이유: 편집·CSV 내보내기·환각 탐지가 전부
 * 항목 단위로 돈다. 중첩하면 그 셋이 전부 2중 순회로 바뀐다.
 *
 * 소속은 **항목 쪽 agendaId 한 군데에만** 적는다. 안건이 항목 id 목록을 따로
 * 들고 있으면, 사용자가 항목을 지웠을 때 두 곳을 같이 고쳐야 하고
 * 한쪽만 고치면 화면이 없는 항목을 그린다. 사실을 두 번 적지 않는다.
 */
export interface ProcessedAgenda {
  id: string
  /** AI가 쓴 제목. **원문 대조를 받지 않는다** */
  title: string
  /** AI가 쓴 요약. **원문 대조를 받지 않는다.** 논의랄 게 없으면 null */
  summary: string | null
}

export interface ProcessedMeeting {
  /** 기한 환산에 실제로 쓴 날짜 */
  meetingDate: DateKey | null
  /** 원문에 적혀 있던 표현. 환산 여부와 무관하게 그대로 내보낸다 */
  meetingDateRaw: string | null
  meetingDateSource: MeetingDateSource
  /**
   * TPO — 시각·장소·목적. AI 발췌를 그대로 흘려보낸다.
   * 환산할 것도 대조할 것도 없어서 코드가 손대지 않는다.
   * 날짜와 달리 사용자 지정·기본값이 없으므로 source도 없다 — 원문에 있거나 없거나 둘 뿐.
   */
  meetingTimeRaw: string | null
  meetingPlaceRaw: string | null
  purposeRaw: string | null
  attendees: RawAttendee[]
  /**
   * 안건 목록. **제목·요약 두 칸만 검증을 못 받는다.**
   *
   * 나머지 칸은 전부 원문 발췌라 verify.ts가 원문과 대조한다.
   * 이 둘은 AI가 쓴 문장이라 대조할 원문이 없다 — 틀려도 코드가 못 잡는다.
   * 그래서 값을 내보내되, 화면이 "확인이 필요합니다"를 항상 같이 그린다.
   *
   * 다만 **묶음이 틀리면 화면에서 바로 보인다.** 상관없는 항목이 한 칸에 들어가
   * 있으면 읽는 순간 안다. 검증 면적을 넓히면서도 허용한 근거가 이것이다.
   */
  agendas: ProcessedAgenda[]
  /** 안건에 상관없이 평면. 소속은 각 항목의 agendaId가 들고 있다 */
  items: ProcessedItem[]
  /** 인용문이 원문에 없어 탈락한 항목. 감추지 않고 내보낸다 */
  rejected: RejectedItem[]
}

/** 내용 기반 결정적 id. 같은 회의록을 다시 넣어도 같은 id가 나온다 */
function stableId(seed: string): string {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return h.toString(36).padStart(7, '0')
}

function addReason(list: ReviewReason[], reason: ReviewReason): void {
  if (!list.includes(reason)) list.push(reason)
}

/**
 * 코드가 판정하는 사유. AI가 넣었더라도 버리고 코드가 다시 정한다.
 * AI가 "이건 환산 불가"라고 붙였는데 코드가 환산에 성공하는 경우를 막는다.
 */
const CODE_OWNED = new Set<ReviewReason>([
  'due_unparseable',
  'assignee_unmatched',
  'assignee_unknown',
  'duplicate_name',
  'unit_unclear',
  'no_assignee',
  'blocked',
  'superseded',
])

/** 발췌 칸 정리 — 빈 문자열·공백뿐인 값은 null로 접는다 */
function blankToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** 인용문 비교용 — 공백만 접는다 */
function normalizeQuote(quote: string | null | undefined): string | null {
  if (typeof quote !== 'string' || !quote.trim()) return null
  return quote.replace(/\s+/g, ' ').trim()
}

/**
 * 기준일 결정. 출처가 셋이라 우선순위를 여기 한 곳에만 적는다.
 *
 *   1) userDate     사용자가 화면에서 직접 고른 날짜. 사람이 고친 것이므로 무조건 이긴다
 *   2) 원문         AI가 발췌한 meetingDateRaw를 코드가 환산. 회의록 자신이 말하는 날짜
 *   3) fallbackDate 프론트가 채워 보낸 오늘. 원문에 날짜가 없을 때만
 *
 * 2)가 없으면 조용히 3)으로 내려가는 것이 아니라, 어느 쪽을 썼는지 source로 드러낸다.
 */
export function resolveMeetingDate(
  userDate: DateKey | null,
  meetingDateRaw: string | null,
  fallbackDate: DateKey | null,
): { date: DateKey | null; source: MeetingDateSource } {
  if (userDate != null && toEpoch(userDate) != null) return { date: userDate, source: 'user' }

  const base = fallbackDate != null && toEpoch(fallbackDate) != null ? fallbackDate : null
  const fromDocument = parseAbsolute(meetingDateRaw, base)
  if (fromDocument) return { date: fromDocument, source: 'document' }

  if (base) return { date: base, source: 'fallback' }
  return { date: null, source: 'none' }
}

export function postprocess(
  raw: RawExtraction,
  sourceText: string,
  /** 사용자가 화면에서 직접 고른 날짜. 안 골랐으면 null */
  userDate: DateKey | null,
  /** 프론트가 채워 보낸 오늘. 원문에도 날짜가 없을 때만 쓴다 */
  fallbackDate: DateKey | null = null,
): ProcessedMeeting {
  const attendees = Array.isArray(raw.attendeesRaw) ? raw.attendeesRaw : []
  const meetingDateRaw = raw.meetingDateRaw ?? null
  const { date: meetingDate, source: meetingDateSource } = resolveMeetingDate(
    userDate,
    meetingDateRaw,
    fallbackDate,
  )

  // 0) 안건 안에 든 항목을 평면으로 펼친다.
  //    소속(agendaId)은 Map에 기억해 둔다 — verifyItems도 중복 접기도 항목 객체를
  //    그대로 통과시키므로, 참조를 열쇠로 쓰면 인덱스를 따라다닐 필요가 없다.
  const rawAgendas: RawAgenda[] = Array.isArray(raw.agendas) ? raw.agendas : []
  const agendaIdOf = new Map<RawItem, string>()
  const agendaMeta = rawAgendas.map((agenda, index) => {
    // 제목은 비울 수 없는 칸이지만, 비어서 오면 칸을 지우지 않고 비었다고 적는다
    const title = blankToNull(agenda?.title) ?? '(제목 없음)'
    // 인덱스를 섞는 이유: 같은 제목의 안건이 둘이면 id가 겹친다
    const id = stableId(`agenda|${index}|${title}`)
    for (const item of Array.isArray(agenda?.items) ? agenda.items : []) agendaIdOf.set(item, id)
    return { id, title, summary: blankToNull(agenda?.summary) }
  })
  const flatItems = rawAgendas.flatMap((agenda) => (Array.isArray(agenda?.items) ? agenda.items : []))

  // 1) 환각 탐지 — 여기서 떨어진 항목은 아래 단계를 타지 않는다
  const { verified, rejected } = verifyItems(flatItems, sourceText)

  // 5) 동명이인 — 항목별이 아니라 참석자 목록 전체를 보고 한 번에 판정한다
  const duplicates = findDuplicateNames(attendees)

  // 번복된 결정은 항목 하나다. 뒤집힌 쪽을 따로 만들었으면 여기서 접는다.
  const superseded = new Set(
    verified.map((i) => normalizeQuote(i.supersededQuote)).filter((q): q is string => q !== null),
  )
  const deduped = verified.filter((i) => !superseded.has(normalizeQuote(i.quote) ?? ''))

  const items: ProcessedItem[] = deduped.map((item) => {
    // AI가 넣은 사유는 참고만 한다. 코드가 판정할 수 있는 것은 코드가 다시 정한다.
    const reasons: ReviewReason[] = (item.reviewReasons ?? []).filter((r) => !CODE_OWNED.has(r))

    // 2) 기한 — 성공하면 due_unparseable을 붙이지 않는다 (AI 오탐 제거)
    const due = parseDue(item.dueDateRaw, item.anchorDateRaw, meetingDate)
    if (due.unparseable) addReason(reasons, 'due_unparseable')

    // 3) 1인칭은 누구인지 특정할 수 없다. 인용문 검사보다 먼저 본다.
    let assigneeRaw = item.assigneeRaw
    const firstPerson = isFirstPerson(assigneeRaw)
    if (firstPerson) addReason(reasons, 'assignee_unknown')

    // 담당자가 근거 인용문 안에 없으면 AI가 다른 발화에서 끌어온 것이다. 비우고 되묻는다.
    if (!firstPerson && assigneeRaw && !assigneeInQuote(assigneeRaw, item.quote)) {
      assigneeRaw = null
      addReason(reasons, 'no_assignee')
    }
    // 할 일에만 담당자가 필요하다. 결정·미결에는 붙이지 않는다.
    if (!assigneeRaw && item.type === 'action') addReason(reasons, 'no_assignee')

    // 3~4) 참석자 대조 + 후보 제안
    const match = firstPerson
      ? { assignee: null, candidates: [], reasons: [] as ReviewReason[] }
      : matchAssignee(assigneeRaw, item.assigneeContextRaw, attendees)
    for (const r of match.reasons) addReason(reasons, r)

    // 5) 같은 이름이 참석자에 둘 이상이면, 확정됐더라도 사람이 확인해야 한다
    if (duplicates.has(normalizeName(assigneeRaw))) addReason(reasons, 'duplicate_name')

    // 단위 없는 금액
    if (hasUnclearAmount(`${item.content} ${item.quote}`)) addReason(reasons, 'unit_unclear')

    // 선행조건이 있으면 blocked
    if (item.blockedByRaw) addReason(reasons, 'blocked')
    if (item.supersededQuote) addReason(reasons, 'superseded')

    return {
      ...item,
      assigneeRaw,
      id: stableId(`${item.type}|${item.quote}`),
      // 안건이 사라진 항목은 없다. 없으면 위 Map 조립이 틀린 것이므로 빈 문자열로 드러낸다
      agendaId: agendaIdOf.get(item) ?? '',
      due: due.due,
      dueAnchor: due.anchor,
      dueMethod: due.method,
      assignee: match.assignee,
      assigneeCandidates: match.candidates,
      preselect: shouldPreselect(match),
      reviewReasons: reasons,
      // 6) confidence 파생
      confidence: reasons.length === 0 ? 'high' : 'needs_review',
    }
  })

  return {
    meetingDate,
    meetingDateRaw,
    meetingDateSource,
    // 발췌 그대로. 빈 문자열은 null과 같이 취급한다 — 화면이 두 경우를 나눌 이유가 없다
    meetingTimeRaw: blankToNull(raw.meetingTimeRaw),
    meetingPlaceRaw: blankToNull(raw.meetingPlaceRaw),
    purposeRaw: blankToNull(raw.purposeRaw),
    attendees,
    // 제목·요약은 검증 없이 그대로 내보낸다. 코드가 판정할 수 있는 것이 없다.
    // 항목이 하나도 안 남은 안건도 지우지 않는다 — 비었다는 사실 자체가 정보다.
    agendas: agendaMeta,
    items,
    rejected,
  }
}
