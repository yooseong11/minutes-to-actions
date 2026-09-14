/**
 * 날짜 파싱. AI가 아니라 코드가 한다.
 *
 * AI는 "만료 30일 전", "담주 화요일"을 원문 그대로 뱉고,
 * 실제 날짜 환산은 전부 여기서 한다. 환산 실패는 감추지 않고 due_unparseable로 올린다.
 *
 * 순수 함수. Date 객체가 밖으로 나가지 않는다 (UTC 기준 정수 연산).
 */
import type { DateKey } from './types'

const DAY = 86_400_000

const WEEKDAYS: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }

/** 기한을 어떻게 구했는가 */
export type DueMethod = 'none' | 'backward' | 'absolute' | 'relative' | 'failed'

export interface DueResult {
  due: DateKey | null
  anchor: DateKey | null
  method: DueMethod
  /** true면 postprocess가 due_unparseable을 승격한다 */
  unparseable: boolean
}

/** 'YYYY-MM-DD' → epoch ms (UTC). 형식이 아니면 null */
export function toEpoch(dateKey: string | null | undefined): number | null {
  if (typeof dateKey !== 'string') return null
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3])
  return Number.isNaN(ms) ? null : ms
}

/** epoch ms → 'YYYY-MM-DD' */
export function toDateKey(ms: number): DateKey | null {
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString().slice(0, 10)
}

function shiftDays(dateKey: string | null, days: number): DateKey | null {
  const ms = toEpoch(dateKey)
  return ms == null ? null : toDateKey(ms + days * DAY)
}

function endOfMonth(dateKey: string | null): DateKey | null {
  const ms = toEpoch(dateKey)
  if (ms == null) return null
  const d = new Date(ms)
  return toDateKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
}

/**
 * 절대 날짜 표현을 해석한다.
 * "11월 2일", "11/2", "2026-11-02", "11.2"
 * 연도가 없으면 base의 연도를 쓰되, 결과가 base보다 6개월 이상 과거면 다음 해로 본다.
 */
export function parseAbsolute(raw: unknown, baseDateKey: string | null): DateKey | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()

  const iso = text.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/)
  if (iso) return toDateKey(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]))

  const md = text.match(/(\d{1,2})\s*(?:월|[-.\/])\s*(\d{1,2})\s*일?/)
  if (!md) return null
  const month = +md[1]
  const day = +md[2]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const baseMs = toEpoch(baseDateKey)
  const year = baseMs == null ? new Date().getUTCFullYear() : new Date(baseMs).getUTCFullYear()
  let result = Date.UTC(year, month - 1, day)
  if (baseMs != null && result < baseMs - 183 * DAY) result = Date.UTC(year + 1, month - 1, day)
  return toDateKey(result)
}

/**
 * 기준일로부터의 상대 표현을 해석한다.
 * 오늘/내일/모레/글피, N일 뒤, N주 뒤, 이번 주 X요일, 다음(담) 주 X요일,
 * 이번 달 말 / 이번 달 안에, 다음 달 말
 * 주의 시작은 월요일.
 */
export function parseRelative(raw: unknown, baseDateKey: string | null): DateKey | null {
  if (typeof raw !== 'string' || toEpoch(baseDateKey) == null) return null
  const text = raw.replace(/\s+/g, '')

  if (/^오늘/.test(text)) return baseDateKey
  if (text.includes('내일')) return shiftDays(baseDateKey, 1)
  if (text.includes('모레')) return shiftDays(baseDateKey, 2)
  if (text.includes('글피')) return shiftDays(baseDateKey, 3)

  if (/(이번\s*달|이달|금월|월말)(말|안|내)/.test(text) || /^(이번달|이달)/.test(text)) {
    return endOfMonth(baseDateKey)
  }
  if (/다음\s*달(말|안|내)|담달(말|안|내)/.test(text)) {
    const d = new Date(toEpoch(baseDateKey) as number)
    return endOfMonth(toDateKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)))
  }

  const weekday = text.match(/(다음주|담주|차주|이번주|금주)?([일월화수목금토])요일/)
  if (weekday) {
    const target = WEEKDAYS[weekday[2]]
    const nextWeek = /다음주|담주|차주/.test(weekday[1] ?? '')
    const baseMs = toEpoch(baseDateKey) as number
    // 월요일 시작 주로 옮겨서 계산
    const baseIdx = (new Date(baseMs).getUTCDay() + 6) % 7
    const targetIdx = (target + 6) % 7
    const monday = baseMs - baseIdx * DAY
    return toDateKey(monday + (targetIdx + (nextWeek ? 7 : 0)) * DAY)
  }

  const inDays = text.match(/(\d+)일\s*(뒤|후|이내|안에|내)/)
  if (inDays) return shiftDays(baseDateKey, +inDays[1])

  const inWeeks = text.match(/(\d+)주\s*(뒤|후|이내|안에|내)/)
  if (inWeeks) return shiftDays(baseDateKey, +inWeeks[1] * 7)

  return null
}

/**
 * 역산. "만료 30일 전" + anchor 11월 2일 → 10월 3일
 * anchor가 없으면 역산할 수 없다 (null).
 */
export function parseBackward(raw: unknown, anchorDateKey: string | null): DateKey | null {
  if (typeof raw !== 'string' || anchorDateKey == null) return null
  const text = raw.replace(/\s+/g, '')

  const days = text.match(/(\d+)일\s*전/)
  if (days) return shiftDays(anchorDateKey, -(+days[1]))

  const weeks = text.match(/(\d+)주\s*전/)
  if (weeks) return shiftDays(anchorDateKey, -(+weeks[1]) * 7)

  const months = text.match(/(\d+)(?:개)?월\s*전/)
  if (months) {
    const d = new Date(toEpoch(anchorDateKey) as number)
    return toDateKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - +months[1], d.getUTCDate()))
  }

  return null
}

/**
 * 항목 하나의 기한을 확정한다.
 *
 * @param dueDateRaw    "만료 30일 전" / "담주 화요일" / "11월 2일"
 * @param anchorDateRaw "11월 2일" — 역산 기준일 (원문 표현)
 * @param meetingDate   'YYYY-MM-DD' — 회의 날짜
 */
export function parseDue(
  dueDateRaw: string | null | undefined,
  anchorDateRaw: string | null | undefined,
  meetingDate: string | null,
): DueResult {
  const anchor = anchorDateRaw
    ? parseAbsolute(anchorDateRaw, meetingDate) ?? parseRelative(anchorDateRaw, meetingDate)
    : null

  if (dueDateRaw == null || String(dueDateRaw).trim() === '') {
    return { due: null, anchor, method: 'none', unparseable: false }
  }

  // 역산이 먼저다. "만료 30일 전"의 "30일"이 절대 날짜로 잘못 읽히면 안 된다.
  const backward = parseBackward(dueDateRaw, anchor)
  if (backward) return { due: backward, anchor, method: 'backward', unparseable: false }

  const base = anchor ?? meetingDate
  const absolute = parseAbsolute(dueDateRaw, base)
  if (absolute) return { due: absolute, anchor, method: 'absolute', unparseable: false }

  const relative = parseRelative(dueDateRaw, base)
  if (relative) return { due: relative, anchor, method: 'relative', unparseable: false }

  // "여유 될 때", "다음 회의 전까지" — 환산 불가. 감추지 않고 올린다.
  return { due: null, anchor, method: 'failed', unparseable: true }
}
