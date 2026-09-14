import { parseDue, toEpoch } from './date.js'
import type { ProcessedItem, ProcessedMeeting } from './postprocess.js'
import type { ItemType, RawAttendee, ReviewReason } from './types.js'

export type EditableField = 'content' | 'type' | 'assignee' | 'due'
export interface EditableItem extends ProcessedItem {
  /** 최초 추출 결과. 사용자 수정으로 원문 근거를 덮어쓰지 않는다. */
  original?: ProcessedItem
  userCreated?: boolean
  editedFields?: EditableField[]
}
export interface EditableMeeting extends ProcessedMeeting { items: EditableItem[] }
export type ItemPatch = Partial<Pick<ProcessedItem, EditableField>>
const ASSIGNEE_REASONS = new Set<ReviewReason>(['no_assignee', 'assignee_unknown', 'assignee_unmatched', 'duplicate_name'])

export function editItem(item: EditableItem, patch: ItemPatch): EditableItem {
  if (patch.content !== undefined && !patch.content.trim()) throw new Error('안건 내용을 입력해 주세요.')
  if (patch.due != null && toEpoch(patch.due) === null) throw new Error('올바른 날짜를 선택해 주세요.')
  const editedFields = [...new Set([...(item.editedFields ?? []), ...Object.keys(patch) as EditableField[]])]
  const next: EditableItem = {
    ...item, ...patch,
    original: item.original ?? (item.userCreated ? undefined : item),
    editedFields,
    content: (patch.content ?? item.content).trim(),
    reviewReasons: [...item.reviewReasons],
  }
  if ('assignee' in patch) {
    next.reviewReasons = next.reviewReasons.filter(r => !ASSIGNEE_REASONS.has(r))
    next.assigneeCandidates = []
    next.preselect = false
  }
  if ('assignee' in patch || 'type' in patch) {
    next.reviewReasons = next.reviewReasons.filter(r => r !== 'no_assignee')
    if (next.type === 'action' && !next.assignee) next.reviewReasons.push('no_assignee')
  }
  if ('due' in patch) {
    next.reviewReasons = next.reviewReasons.filter(r => r !== 'due_unparseable')
    next.dueMethod = next.due ? 'absolute' : 'none'
    next.dueAnchor = null
  }
  next.confidence = next.reviewReasons.length ? 'needs_review' : 'high'
  return next
}

export function createItem(id: string, type: ItemType, content: string, assignee: RawAttendee | null, due: string | null): EditableItem {
  const item: EditableItem = {
    id, type, content, assignee, due, userCreated: true,
    assigneeRaw: null, assigneeContextRaw: null, dueDateRaw: null, anchorDateRaw: null,
    blockedByRaw: null, quote: '', supersededQuote: null, reviewReasons: [],
    dueAnchor: null, dueMethod: 'none', assigneeCandidates: [], preselect: false, confidence: 'high',
  }
  return editItem(item, { content, assignee, due })
}

/** 기준일만 바꾸면 기존 발췌로 다시 계산한다. 사람이 지정하거나 지운 기한은 유지한다. */
export function recalculateMeeting(meeting: EditableMeeting, date: string | null): EditableMeeting {
  if (date !== null && toEpoch(date) === null) throw new Error('올바른 날짜를 선택해 주세요.')
  return {
    ...meeting, meetingDate: date, meetingDateSource: date ? 'user' : 'none',
    items: meeting.items.map(item => {
      if (item.userCreated || item.editedFields?.includes('due')) return item
      const result = parseDue(item.dueDateRaw, item.anchorDateRaw, date)
      const reviewReasons: ReviewReason[] = item.reviewReasons.filter(r => r !== 'due_unparseable')
      if (result.unparseable) reviewReasons.push('due_unparseable')
      return { ...item, due: result.due, dueAnchor: result.anchor, dueMethod: result.method,
        reviewReasons, confidence: reviewReasons.length ? 'needs_review' as const : 'high' as const }
    }),
  }
}
