/**
 * 마크다운 내보내기 (섹션 5).
 *
 * **화면(`src/ResultDoc.tsx`)의 순서와 제목을 그대로 따릅니다.**
 * 참석자 → TPO → 안건(제목 → 요약 → 항목). 둘이 어긋나면 하나가 거짓말이 됩니다.
 *
 * 라벨은 `lib/labels.ts`가 단일 출처입니다. 여기서 한국어 문자열을 새로 쓰지 마십시오.
 *
 * **빈 칸도 제목을 남깁니다.** 장소가 원문에 없다는 것과, 장소 칸이 문서에 없는 것은
 * 다릅니다. 회의록에서 뭐가 빠졌는지는 빈 칸이 남아 있어야 보입니다.
 *
 * **사용자가 고친 값은 표시하지 않습니다** (2026-09-15 확정). 노션에 붙이는 순간
 * 읽는 사람에게 필요한 건 최종값이고, 누가 고쳤는지는 화면에서 이미 보입니다.
 * 검증을 못 받는 칸(안건 제목·요약)의 경고는 이것과 별개로 문서에도 남깁니다 —
 * 그건 편집 이력이 아니라 값의 신뢰도라서, 문서만 받은 사람에게도 필요합니다.
 *
 * 순수 함수. DOM·클립보드를 모릅니다. 테스트가 LLM 없이 돕니다.
 */
import { ITEM_TYPE, REVIEW_REASON } from './labels.js'
import type { ProcessedItem, ProcessedMeeting } from './postprocess.js'
import type { RawAttendee } from './types.js'

/** 원문에 값이 없을 때 칸 대신 남기는 말. 칸을 지우지 않기 위한 것 */
const ABSENT = '원문에 없음'

/** 안건 안에서 읽는 순서. 화면과 같은 규칙(결정 → 할 일 → 미결) */
const TYPE_ORDER: ProcessedItem['type'][] = ['decision', 'action', 'open']

export interface MarkdownOptions {
  /** 항목별 원문 인용과 회의록 전문을 함께 내보낼지. 기본은 false입니다. */
  includeSource?: boolean
  /** 추출 당시의 회의록 원문 */
  sourceText?: string
}

export function toMarkdown(meeting: ProcessedMeeting, options: MarkdownOptions = {}): string {
  const lines = [
    '# 회의록',
    '',
    ...attendeeBlock(meeting.attendees),
    '',
    ...tpoBlock(meeting),
    '',
    ...agendaBlock(meeting, options.includeSource === true),
  ]
  const summary = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
  if (!options.includeSource) return `${summary}\n`

  // 전문 안의 연속 빈 줄은 원문의 일부입니다. 요약의 빈 줄 정리 대상에 섞지 않습니다.
  return `${summary}\n\n${sourceBlock(options.sourceText ?? '').join('\n')}\n`
}

/** 참석자 — 화면의 Joiner 칸 */
function attendeeBlock(attendees: RawAttendee[]): string[] {
  if (attendees.length === 0) return ['## 참석자', '', '본문에서 참석자를 찾지 못했습니다.']
  return ['## 참석자', '', ...attendees.map((a) => `- ${personName(a)}`)]
}

/** TPO — 날짜·시각·장소·목적. 화면의 TpoRow 네 줄과 같은 순서 */
function tpoBlock(meeting: ProcessedMeeting): string[] {
  return [
    '## TPO',
    '',
    `- 날짜: ${meeting.meetingDate ?? meeting.meetingDateRaw ?? ABSENT}`,
    `- 시각: ${meeting.meetingTimeRaw ?? ABSENT}`,
    `- 장소: ${meeting.meetingPlaceRaw ?? ABSENT}`,
    `- 목적: ${meeting.purposeRaw ?? ABSENT}`,
  ]
}

/**
 * 안건 묶음.
 *
 * 항목이 하나도 없는 안건도 지우지 않습니다 — 화면과 같은 규칙입니다.
 * AI가 안건이라고 본 화제인데 항목이 비었다는 사실 자체가 정보입니다.
 */
function agendaBlock(meeting: ProcessedMeeting, includeSource: boolean): string[] {
  const lines = [
    '## 안건',
    '',
    '> 확인이 필요합니다. 안건 제목과 안건 요약은 원문 발췌가 아니라 AI가 쓴 문장입니다.',
    '',
  ]
  if (meeting.agendas.length === 0) {
    lines.push('본문에서 안건을 찾지 못했습니다.')
    return lines
  }
  meeting.agendas.forEach((agenda, index) => {
    lines.push(`### ${index + 1}. ${agenda.title}`, '')
    lines.push(agenda.summary ?? '_요약할 논의가 없습니다._', '')
    const items = sortByType(meeting.items.filter((i) => i.agendaId === agenda.id))
    if (items.length === 0) lines.push('_이 안건에 남은 항목이 없습니다._', '')
    else lines.push(...items.flatMap((item) => itemLines(item, includeSource)), '')
  })
  return lines
}

/**
 * 항목 한 덩이 — 한 줄 + (있으면) 인용문.
 *
 * 화면의 줄과 같은 정보를 같은 순서로 답니다: 분류 → 담당자 → 내용 → 기한 → 검토 사유.
 * 번복된 항목은 배지가 아니라 취소선입니다. 항목의 상태라서 그렇습니다.
 */
function itemLines(item: ProcessedItem, includeSource: boolean): string[] {
  const struck = item.reviewReasons.includes('superseded')
  const text = struck ? `~~${item.content}~~` : item.content
  const due = item.due ?? item.dueDateRaw
  const flags = item.reviewReasons.map((r) => `\`${REVIEW_REASON[r].label}\``)

  const head = [
    `- **${ITEM_TYPE[item.type]}**`,
    assigneeLabel(item),
    text,
    due ? `(기한: ${due})` : '',
    flags.join(' '),
  ].filter(Boolean).join(' ')

  const detail: string[] = []
  if (includeSource && item.quote) detail.push(`  > ${oneLine(item.quote)}`)
  // 인용문 바로 뒤에 `>` 줄을 또 붙이면 마크다운이 한 덩이로 합쳐 읽힙니다.
  // 뒤집힌 내용은 원문 인용이 아니라 항목에 대한 주석이라 목록 줄로 뺍니다.
  if (includeSource && item.supersededQuote) detail.push(`  - 뒤집힌 내용: ${oneLine(item.supersededQuote)}`)
  if (item.blockedByRaw) detail.push(`  - 선행: ${item.blockedByRaw}`)
  return [head, ...detail]
}

/** 원문 전문은 입력 모양을 잃지 않도록 코드 블록으로 보존합니다. */
function sourceBlock(sourceText: string): string[] {
  const source = sourceText.trim()
  if (!source) return ['## 회의록 원문', '', '_원문이 없습니다._']

  // 원문 안의 백틱보다 긴 fence를 골라 원문이 코드 블록을 닫지 못하게 합니다.
  const longestRun = Math.max(0, ...(source.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(Math.max(3, longestRun + 1))
  return ['## 회의록 원문', '', `${fence}text`, source, fence]
}

/** 항목별 인용은 읽기 쉽게 공백과 줄바꿈을 한 줄로 접습니다. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** 담당자. 확정 안 된 할 일은 빈칸이 아니라 "담당자 미정"으로 남깁니다 */
function assigneeLabel(item: ProcessedItem): string {
  if (item.assignee) return `${personName(item.assignee)} —`
  if (item.type === 'action') return '담당자 미정 —'
  return ''
}

function personName(person: RawAttendee): string {
  return person.contextRaw ? `${person.nameRaw}(${person.contextRaw})` : person.nameRaw
}

function sortByType(items: ProcessedItem[]): ProcessedItem[] {
  return [...items].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
}
