/**
 * 후처리 조립. AI 응답을 받아 코드가 검사·계산·대조한 결과로 바꾼다.
 *
 * 순서 (00_인수인계.md 기준)
 *   1) quote / supersededQuote 환각 탐지
 *   2) parseDue — 상대날짜·역산.  실패하면 due_unparseable 승격
 *   3) assigneeRaw를 attendeesRaw와 대조. 실패하면 assignee_unmatched 승격
 *   4) 후보 제안 — 1명일 때만 미리 선택
 *   5) 같은 이름이 2명 이상이면 duplicate_name 승격
 *   6) confidence 파생
 *
 * 순수 함수. LLM 호출 없음.
 */
import { parseDue, type DueMethod } from './date.js'
import { findDuplicateNames, matchAssignee, normalizeName, shouldPreselect } from './people.js'
import { verifyItems, type RejectedItem } from './verify.js'
import type { Confidence, DateKey, RawAttendee, RawExtraction, RawItem, ReviewReason } from './types.js'

export interface ProcessedItem extends RawItem {
  /** 회의 안에서 안정적인 id. 나중에 DB를 붙일 때 그대로 쓴다 */
  id: string
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

export interface ProcessedMeeting {
  meetingDate: DateKey | null
  meetingDateRaw: string | null
  attendees: RawAttendee[]
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

export function postprocess(
  raw: RawExtraction,
  sourceText: string,
  meetingDate: DateKey | null,
): ProcessedMeeting {
  const attendees = Array.isArray(raw.attendeesRaw) ? raw.attendeesRaw : []

  // 1) 환각 탐지 — 여기서 떨어진 항목은 아래 단계를 타지 않는다
  const { verified, rejected } = verifyItems(raw.items, sourceText)

  // 5) 동명이인 — 항목별이 아니라 참석자 목록 전체를 보고 한 번에 판정한다
  const duplicates = findDuplicateNames(attendees)

  const items: ProcessedItem[] = verified.map((item) => {
    const reasons: ReviewReason[] = [...(item.reviewReasons ?? [])]

    // 2) 기한
    const due = parseDue(item.dueDateRaw, item.anchorDateRaw, meetingDate)
    if (due.unparseable) addReason(reasons, 'due_unparseable')

    // 3~4) 참석자 대조 + 후보 제안
    const match = matchAssignee(item.assigneeRaw, item.assigneeContextRaw, attendees)
    for (const r of match.reasons) addReason(reasons, r)

    // 5) 같은 이름이 참석자에 둘 이상이면, 확정됐더라도 사람이 확인해야 한다
    if (duplicates.has(normalizeName(item.assigneeRaw))) addReason(reasons, 'duplicate_name')

    // 선행조건이 있으면 blocked
    if (item.blockedByRaw) addReason(reasons, 'blocked')

    return {
      ...item,
      id: stableId(`${item.type}|${item.quote}`),
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
    meetingDateRaw: raw.meetingDateRaw ?? null,
    attendees,
    items,
    rejected,
  }
}
