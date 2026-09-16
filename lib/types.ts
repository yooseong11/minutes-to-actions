/**
 * extract-prompt.md의 출력 스키마와 1:1로 대응하는 타입.
 *
 * AI가 뱉는 "발췌형" 원시 타입(Raw*)과, 코드 후처리를 거친 타입을 나눈다.
 * 스키마가 바뀌면 여기와 regression/answer-key.md를 같이 고칠 것.
 */

/** AI가 고르는 분류. 3종 유지 (샘플 02의 번복된 결정이 갈 곳이 open뿐) */
export type ItemType = 'decision' | 'action' | 'open'

/** 검토 사유. 자유 문장이 아니라 정해진 코드값 */
export type ReviewReason =
  | 'no_assignee'
  | 'assignee_unknown'
  | 'assignee_unmatched'
  | 'duplicate_name'
  | 'due_unparseable'
  | 'unit_unclear'
  | 'superseded'
  | 'blocked'
  | 'conditional'
  | 'ambiguous_intent'

export interface RawAttendee {
  nameRaw: string
  /** "회계" / "개발팀" — 동명이인 구분용 */
  contextRaw: string | null
}

/** AI 출력 항목. 전부 원문 발췌이며 계산·대조 결과는 들어 있지 않다. */
export interface RawItem {
  type: ItemType
  content: string
  assigneeRaw: string | null
  assigneeContextRaw: string | null
  /** "담주 화요일" — 원문 그대로 */
  dueDateRaw: string | null
  /** "11월 2일" — 역산 기준일 */
  anchorDateRaw: string | null
  /** "업체 확정" — 기한이 아니다 */
  blockedByRaw: string | null
  reviewReasons: ReviewReason[]
  quote: string
  supersededQuote: string | null
}

/**
 * 안건 하나. **항목을 담는 그릇이다.**
 *
 * 항목의 단위는 발화지만, 사람이 회의를 기억하는 단위는 안건이다.
 * 발화 단위는 환각 탐지(quote 대조)를 쉽게 하려고 고른 것이지 읽으라고 고른 게 아니다.
 * 그래서 항목은 그대로 두고 **그 위에 한 겹**을 올린다.
 *
 * `title`과 `summary`는 **원문 발췌가 아니다.** AI가 쓴 문장이라 대조할 원문이 없다.
 * 이 프로젝트에서 검증을 못 받는 칸은 이 둘뿐이고, 화면이 둘에만 경고를 붙인다.
 * 대신 묶음이 틀리면 상관없는 항목이 한 칸에 들어가 **읽는 순간 보인다** —
 * 이전의 discussionSummary처럼 조용히 틀리는 종류가 아니라서 허용했다.
 */
export interface RawAgenda {
  /** "사내 문의 대응" — AI가 쓴 제목. 발췌 아님 */
  title: string
  /** 이 안건에서 무슨 얘기가 오갔는지 1~3문장. 논의랄 게 없으면 null */
  summary: string | null
  items: RawItem[]
}

export interface RawExtraction {
  meetingDateRaw: string | null
  /** "10:00" / "오전 10시" — 원문 그대로. 환산하지 않는다 */
  meetingTimeRaw: string | null
  /** "대회의실" / "온라인(줌)" — 원문 그대로 */
  meetingPlaceRaw: string | null
  /** 회의 목적. 제목 줄이나 "안건:" 줄에서 발췌. 지어내지 않는다 */
  purposeRaw: string | null
  attendeesRaw: RawAttendee[]
  /**
   * 항목은 여기 안에만 있다. 최상위 items는 없앴다 —
   * 두 군데에 담으면 어느 쪽이 진짜인지 코드가 계속 골라야 한다.
   */
  agendas: RawAgenda[]
}

/** 'YYYY-MM-DD' */
export type DateKey = string

/** reviewReasons가 비면 high, 아니면 needs_review. 코드가 파생한다. */
export type Confidence = 'high' | 'needs_review'
