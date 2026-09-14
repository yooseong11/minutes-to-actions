/**
 * 사유·분류를 사람 말로 바꾸는 표.
 *
 * `lib/`에 두는 이유: 같은 문자열을 화면과 CSV 내보내기(섹션 5)가 같이 씁니다.
 * 화면에만 두면 CSV의 사유 칸이 `no_assignee`로 나가거나, 두 군데를 따로 고치게 됩니다.
 *
 * 순수 데이터. import 부작용 없음.
 */
import type { ItemType, ReviewReason } from './types.js'

/**
 * 사유가 화면에서 어떻게 다뤄지는가. **"확인해라"와 "답을 달라"는 다른 동작입니다.**
 *   ask    — 되묻기. 사람이 빈칸을 채워야 저장된다
 *   warn   — 노란 배지. 읽고 넘어가면 되고 저장은 된다
 *   strike — 취소선. 배지가 아니라 항목 자체의 상태다
 */
export type ReasonKind = 'ask' | 'warn' | 'strike'

export interface ReasonLabel {
  label: string
  kind: ReasonKind
}

export const REVIEW_REASON: Record<ReviewReason, ReasonLabel> = {
  no_assignee: { label: '담당자 필요', kind: 'ask' },
  assignee_unknown: { label: '누구인지 불명', kind: 'ask' },
  assignee_unmatched: { label: '참석자에 없는 이름', kind: 'ask' },
  duplicate_name: { label: '동명이인', kind: 'ask' },
  unit_unclear: { label: '금액 단위 불명', kind: 'ask' },
  due_unparseable: { label: '기한 환산 실패', kind: 'warn' },
  blocked: { label: '선행조건 있음', kind: 'warn' },
  conditional: { label: '조건부', kind: 'warn' },
  ambiguous_intent: { label: '의도 모호', kind: 'warn' },
  superseded: { label: '번복됨', kind: 'strike' },
}

export const ITEM_TYPE: Record<ItemType, string> = {
  decision: '결정',
  action: '할 일',
  open: '미결',
}

/** 해당 종류의 사유 개수. 범례 문구가 숫자를 직접 세지 않도록 */
export function countReasons(kind: ReasonKind): number {
  return Object.values(REVIEW_REASON).filter((r) => r.kind === kind).length
}
