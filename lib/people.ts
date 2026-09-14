/**
 * 참석자 대조. AI가 아니라 코드가 한다.
 *
 * AI는 "김 대리", "민수씨"를 원문 그대로 뱉고, 같은 사람인지 판단하는 것은 여기서 한다.
 * 자동으로 확정하는 경우는 없다 — 후보가 유일할 때만 "미리 선택"해서 띄우고,
 * 애매하면 후보만 나열하고 사람이 고른다.
 *
 * 순수 함수. LLM 호출 없음.
 */
import type { RawAttendee, ReviewReason } from './types.js'

/** 이름 뒤에 붙는 호칭 */
const HONORIFICS = ['님', '씨']

/** 직함. 이름과 붙여 쓰기도 하고("박팀장") 띄어 쓰기도 한다("김 대리") */
const TITLES = ['팀장', '대리', '과장', '차장', '부장', '사원', '주임', '실장', '이사', '대표', '선임', '책임']

/**
 * 비교용 이름 정규화.
 * "김 대리" → "김",  "박팀장" → "박",  "최영호 님" → "최영호",  "김민수" → "김민수"
 * 직함만 있는 "팀장님"은 ""이 되어 대조 대상에서 빠진다.
 */
export function normalizeName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  let name = raw.replace(/\s+/g, '').replace(/\([^)]*\)/g, '')
  for (const h of HONORIFICS) {
    if (name.endsWith(h) && name.length > 1) name = name.slice(0, -h.length)
  }
  for (const t of TITLES) {
    if (name.endsWith(t)) {
      name = name.slice(0, -t.length)
      break
    }
  }
  return name
}

/** attendeesRaw에 같은 nameRaw가 2개 이상 있으면 그 이름을 동명이인으로 본다 */
export function findDuplicateNames(attendees: RawAttendee[]): Set<string> {
  const seen = new Map<string, number>()
  for (const a of attendees) {
    const key = normalizeName(a.nameRaw)
    if (!key) continue
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k))
}

export interface AssigneeMatch {
  /** 확정된 담당자. 확정하지 못하면 null */
  assignee: RawAttendee | null
  /** 되묻기 창에 띄울 후보. assignee가 정해졌으면 비어 있다 */
  candidates: RawAttendee[]
  /** 코드가 승격하는 검토 사유 */
  reasons: ReviewReason[]
}

const NO_ASSIGNEE: AssigneeMatch = { assignee: null, candidates: [], reasons: [] }

/**
 * 담당자 이름을 참석자 목록과 대조한다.
 *
 * 1. 정확히 일치하는 참석자가 1명 → 확정
 * 2. 정확히 일치가 2명 이상 → 동명이인. contextRaw로 갈리면 확정, 아니면 후보만 나열
 * 3. 일치 없음 → 성씨 부분일치로 후보를 찾는다
 *      후보 1명 → 미리 선택 (확정은 아님. 사용자가 클릭 한 번으로 확정)
 *      후보 2명 이상 → 나열만, 아무것도 선택하지 않음
 *    어느 쪽이든 assignee_unmatched를 붙인다 — 사람이 확인해야 한다
 */
export function matchAssignee(
  assigneeRaw: string | null | undefined,
  assigneeContextRaw: string | null | undefined,
  attendees: RawAttendee[],
): AssigneeMatch {
  const target = normalizeName(assigneeRaw)
  if (!target) return NO_ASSIGNEE

  const exact = attendees.filter((a) => normalizeName(a.nameRaw) === target)

  if (exact.length === 1) {
    const only = exact[0] as RawAttendee
    return { assignee: only, candidates: [], reasons: [] }
  }

  if (exact.length > 1) {
    // 동명이인. 소속이 적혀 있고 그걸로 한 명만 남으면 확정한다.
    const context = (assigneeContextRaw ?? '').replace(/\s+/g, '')
    const byContext = context
      ? exact.filter((a) => (a.contextRaw ?? '').replace(/\s+/g, '').includes(context))
      : []
    if (byContext.length === 1) {
      return { assignee: byContext[0] as RawAttendee, candidates: [], reasons: ['duplicate_name'] }
    }
    // 갈리지 않으면 아무것도 선택하지 않는다. 사람이 고른다.
    return { assignee: null, candidates: exact, reasons: ['duplicate_name'] }
  }

  // 성씨 부분일치. "김 대리" → "김" → 김으로 시작하는 참석자
  const partial = attendees.filter((a) => {
    const name = normalizeName(a.nameRaw)
    return name !== '' && (name.startsWith(target) || target.startsWith(name))
  })

  // 후보가 유일할 때만 미리 선택해서 띄운다. 확정이 아니라 제안이다.
  return { assignee: null, candidates: partial, reasons: ['assignee_unmatched'] }
}

/** 후보를 미리 선택해 띄울지 — 정확히 1명일 때만 */
export function shouldPreselect(match: AssigneeMatch): boolean {
  return match.assignee === null && match.candidates.length === 1 && !match.reasons.includes('duplicate_name')
}
