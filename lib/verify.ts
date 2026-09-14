/**
 * quote 환각 탐지.
 *
 * AI가 뱉은 인용문이 회의록 원문에 실제로 존재하는지 문자열 포함으로 검사한다.
 * 없으면 AI가 지어낸 것이므로 그 항목 전체를 신뢰할 수 없다.
 *
 * 순수 함수. LLM 호출 없음.
 */
import type { RawItem } from './types.ts'

/** 원문에 없는 것으로 판정된 필드 */
export type HallucinatedField = 'quote' | 'supersededQuote'

export interface QuoteCheck {
  ok: boolean
  hallucinated: HallucinatedField[]
}

export interface RejectedItem {
  item: RawItem
  hallucinated: HallucinatedField[]
}

export interface VerifyResult {
  verified: RawItem[]
  rejected: RejectedItem[]
}

/**
 * 비교용 정규화.
 * 줄바꿈·연속 공백만 접는다. 글자는 건드리지 않는다.
 * (AI가 "한 글자도 바꾸지 말 것"을 지켰는지 봐야 하므로 관대하게 만들면 안 된다.)
 */
export function normalizeForCompare(text: unknown): string {
  if (typeof text !== 'string') return ''
  return text.replace(/\s+/g, ' ').trim()
}

/** 인용문이 원문 안에 그대로 있는가 */
export function quoteExists(quote: unknown, sourceText: unknown): boolean {
  const q = normalizeForCompare(quote)
  if (!q) return false
  return normalizeForCompare(sourceText).includes(q)
}

/** 항목 하나의 quote / supersededQuote를 검사한다. */
export function verifyItemQuotes(item: Partial<RawItem> | null | undefined, sourceText: string): QuoteCheck {
  const hallucinated: HallucinatedField[] = []
  if (!quoteExists(item?.quote, sourceText)) hallucinated.push('quote')
  if (item?.supersededQuote != null && !quoteExists(item.supersededQuote, sourceText)) {
    hallucinated.push('supersededQuote')
  }
  return { ok: hallucinated.length === 0, hallucinated }
}

/**
 * 항목 배열을 검사해 통과/탈락으로 가른다.
 * 탈락한 항목은 버리지 않고 rejected로 돌려준다 — 화면에서 "AI가 지어낸 항목"을
 * 드러내야 자동 추출의 한계가 감춰지지 않는다.
 */
export function verifyItems(items: RawItem[] | unknown, sourceText: string): VerifyResult {
  const verified: RawItem[] = []
  const rejected: RejectedItem[] = []
  for (const item of Array.isArray(items) ? (items as RawItem[]) : []) {
    const result = verifyItemQuotes(item, sourceText)
    if (result.ok) verified.push(item)
    else rejected.push({ item, hallucinated: result.hallucinated })
  }
  return { verified, rejected }
}
