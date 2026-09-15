import { parseDue, toEpoch } from './date.js'
import type { ProcessedItem, ProcessedMeeting } from './postprocess.js'
import type { ItemType, RawAttendee, ReviewReason } from './types.js'

export type EditableField = 'content' | 'type' | 'assignee' | 'due'
export type EditableTpoField = 'meetingDate' | 'meetingTimeRaw' | 'meetingPlaceRaw' | 'purposeRaw'
export interface EditableItem extends ProcessedItem {
  /** 최초 추출 결과. 사용자 수정으로 원문 근거를 덮어쓰지 않는다. */
  original?: ProcessedItem
  userCreated?: boolean
  editedFields?: EditableField[]
}
export interface EditableMeeting extends ProcessedMeeting {
  items: EditableItem[]
  /** 최초 추출값. 사용자가 TPO를 고쳐도 원문에서 가져온 값을 잃지 않는다. */
  originalTpo?: Pick<ProcessedMeeting, EditableTpoField | 'meetingDateSource'>
  editedTpoFields?: EditableTpoField[]
  /** 참석자도 마찬가지. 고쳐도 원문에서 뽑은 목록은 남긴다. */
  originalAttendees?: RawAttendee[]
  attendeesEdited?: boolean
}

/**
 * 화면에서 편집 중인 참석자 한 명.
 *
 * `originalIndex`가 핵심입니다. 이게 없으면 "김대리 → 김주임"이 **이름 변경**인지
 * "김대리 삭제 + 김주임 추가"인지 구분할 방법이 없습니다. 둘은 담당자 처리가
 * 정반대입니다 — 변경은 담당자가 따라가고, 삭제는 담당자를 비웁니다.
 */
export interface AttendeeDraft {
  nameRaw: string
  contextRaw: string | null
  /** 최초 목록에서의 자리. 새로 추가한 사람은 null */
  originalIndex: number | null
}
export type ItemPatch = Partial<Pick<ProcessedItem, EditableField>>
export type TpoValues = Pick<ProcessedMeeting, EditableTpoField>
const ASSIGNEE_REASONS = new Set<ReviewReason>(['no_assignee', 'assignee_unknown', 'assignee_unmatched', 'duplicate_name'])

export function editItem(item: EditableItem, patch: ItemPatch): EditableItem {
  if (patch.content !== undefined && !patch.content.trim()) throw new Error('항목 내용을 입력해 주세요.')
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

/** 직접 추가한 항목도 반드시 어느 안건에 속한다. 안건 없는 항목은 화면에 그릴 자리가 없다 */
export function createItem(id: string, agendaId: string, type: ItemType, content: string, assignee: RawAttendee | null, due: string | null): EditableItem {
  const item: EditableItem = {
    id, agendaId, type, content, assignee, due, userCreated: true,
    assigneeRaw: null, assigneeContextRaw: null, dueDateRaw: null, anchorDateRaw: null,
    blockedByRaw: null, quote: '', supersededQuote: null, reviewReasons: [],
    dueAnchor: null, dueMethod: 'none', assigneeCandidates: [], preselect: false, confidence: 'high',
  }
  return editItem(item, { content, assignee, due })
}

/** TPO 네 칸을 한 번에 저장한다. 날짜가 달라진 경우에만 자동 계산 기한도 다시 계산한다. */
export function editMeetingTpo(meeting: EditableMeeting, values: TpoValues): EditableMeeting {
  if (values.meetingDate !== null && toEpoch(values.meetingDate) === null) {
    throw new Error('올바른 날짜를 선택해 주세요.')
  }

  const nextValues: TpoValues = {
    meetingDate: values.meetingDate,
    meetingTimeRaw: blankToNull(values.meetingTimeRaw),
    meetingPlaceRaw: blankToNull(values.meetingPlaceRaw),
    purposeRaw: blankToNull(values.purposeRaw),
  }
  const changed = (Object.keys(nextValues) as EditableTpoField[])
    .filter(field => nextValues[field] !== meeting[field])
  if (changed.length === 0) return meeting

  const withDate = changed.includes('meetingDate')
    ? recalculateMeeting(meeting, nextValues.meetingDate)
    : meeting

  return {
    ...withDate,
    ...nextValues,
    originalTpo: meeting.originalTpo ?? {
      meetingDate: meeting.meetingDate,
      meetingDateSource: meeting.meetingDateSource,
      meetingTimeRaw: meeting.meetingTimeRaw,
      meetingPlaceRaw: meeting.meetingPlaceRaw,
      purposeRaw: meeting.purposeRaw,
    },
    editedTpoFields: [...new Set([...(meeting.editedTpoFields ?? []), ...changed])],
  }
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

function blankToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed || null
}

/**
 * 참석자 목록을 한 번에 저장한다.
 *
 * 항목의 담당자는 참석자 목록을 **가리키는 참조가 아니라 값의 사본**이다.
 * 그래서 목록만 고치면 항목에는 없는 사람 이름이 조용히 남는다. 여기서 맞춘다.
 *   이름 변경 → 그 사람이 담당인 항목도 따라 바뀐다
 *   삭제      → 담당자를 비우고, 할 일이면 '담당자 없음'이 붙는다
 */
export function editMeetingAttendees(meeting: EditableMeeting, drafts: AttendeeDraft[]): EditableMeeting {
  const attendees: RawAttendee[] = drafts.map(draft => ({
    nameRaw: draft.nameRaw.trim(),
    contextRaw: blankToNull(draft.contextRaw),
  }))
  if (attendees.some(person => !person.nameRaw)) throw new Error('참석자 이름을 입력해 주세요.')

  const before = meeting.attendees
  const untouched = attendees.length === before.length
    && attendees.every((person, index) =>
      drafts[index].originalIndex === index && sameAttendee(person, before[index]))
  if (untouched) return meeting

  /** 최초 목록의 자리 → 바뀐 값. 자리가 여기 없으면 지워진 사람이다 */
  const renamed = new Map<number, RawAttendee>()
  const kept = new Set<number>()
  drafts.forEach((draft, index) => {
    if (draft.originalIndex === null) return
    kept.add(draft.originalIndex)
    if (!sameAttendee(before[draft.originalIndex], attendees[index])) {
      renamed.set(draft.originalIndex, attendees[index])
    }
  })

  const items = meeting.items.map(item => {
    const assignee = item.assignee
    if (!assignee) return item
    const index = before.findIndex(person => sameAttendee(person, assignee))
    if (index === -1) return item
    const next = renamed.get(index)
    if (next) return editItem(item, { assignee: next })
    if (!kept.has(index)) return editItem(item, { assignee: null })
    return item
  })

  return {
    ...meeting,
    attendees,
    items,
    originalAttendees: meeting.originalAttendees ?? before,
    attendeesEdited: true,
  }
}

function sameAttendee(left: RawAttendee | null, right: RawAttendee | null): boolean {
  return left?.nameRaw === right?.nameRaw && (left?.contextRaw ?? null) === (right?.contextRaw ?? null)
}
