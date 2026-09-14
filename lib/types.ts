/**
 * extract-prompt.md의 출력 스키마와 1:1로 대응하는 타입.
 *
 * AI가 뱉는 "발췌형" 원시 타입(Raw*)과, 코드 후처리를 거친 타입을 나눈다.
 * 스키마가 바뀌면 여기와 00_함정_정답지.md를 같이 고칠 것.
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

export interface RawExtraction {
  meetingDateRaw: string | null
  /** "10:00" / "오전 10시" — 원문 그대로. 환산하지 않는다 */
  meetingTimeRaw: string | null
  /** "대회의실" / "온라인(줌)" — 원문 그대로 */
  meetingPlaceRaw: string | null
  /** 회의 목적. 제목 줄이나 "안건:" 줄에서 발췌. 지어내지 않는다 */
  purposeRaw: string | null
  attendeesRaw: RawAttendee[]
  items: RawItem[]
}

/** 'YYYY-MM-DD' */
export type DateKey = string

/** reviewReasons가 비면 high, 아니면 needs_review. 코드가 파생한다. */
export type Confidence = 'high' | 'needs_review'
