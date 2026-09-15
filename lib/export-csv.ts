/**
 * CSV 내보내기 (섹션 5).
 *
 * 마크다운이 "읽는 문서"라면 CSV는 **엑셀에서 거르는 표**입니다.
 * 그래서 안건 묶음(중첩)을 펴서 한 항목 = 한 줄로 만들고, 안건은 컬럼으로 내립니다.
 *
 * 라벨은 `lib/labels.ts`가 단일 출처입니다. `no_assignee` 같은 코드값이 나가면 안 됩니다.
 *
 * **전체 항목을 넣습니다** (2026-09-15 확정). 결정·할 일·미결을 다 넣고 「분류」로 거릅니다.
 * 빼고 내보내면 엑셀에서 다시 붙일 방법이 없지만, 넣어두면 필터 한 번이면 됩니다.
 *
 * 순수 함수. Blob·DOM을 모릅니다.
 */
import { ITEM_TYPE, REVIEW_REASON } from './labels.js'
import type { ProcessedItem, ProcessedMeeting } from './postprocess.js'

/**
 * 컬럼 순서. **마크다운이 한 줄에 싣는 정보와 같은 순서**입니다.
 * 앞쪽이 거르는 칸(안건·분류·담당자), 뒤쪽이 읽는 칸(검토사유·인용문)입니다.
 */
export const CSV_HEADERS = [
  '회의날짜', '안건', '분류', '내용', '담당자', '기한', '선행조건', '검토사유', '인용문',
] as const

/** 검토 사유가 여럿일 때 한 셀에 넣는 구분자. 쉼표를 쓰면 셀이 갈라져 보입니다 */
const REASON_SEPARATOR = '; '

export function toCsv(meeting: ProcessedMeeting): string {
  const agendaTitle = new Map(meeting.agendas.map((a) => [a.id, a.title]))
  const rows = meeting.items.map((item) => [
    meeting.meetingDate ?? meeting.meetingDateRaw ?? '',
    agendaTitle.get(item.agendaId) ?? '',
    ITEM_TYPE[item.type],
    item.content,
    assigneeCell(item),
    item.due ?? item.dueDateRaw ?? '',
    item.blockedByRaw ?? '',
    item.reviewReasons.map((r) => REVIEW_REASON[r].label).join(REASON_SEPARATOR),
    item.quote,
  ])
  // BOM이 없으면 엑셀이 한글을 깨서 엽니다. CRLF는 RFC 4180 규칙입니다.
  return '﻿' + [[...CSV_HEADERS], ...rows].map(csvRow).join('\r\n') + '\r\n'
}

/** 파일 이름. 날짜가 없으면 날짜 자리를 비우지 않고 '날짜미상'을 넣습니다 */
export function csvFileName(meeting: ProcessedMeeting): string {
  return `회의록_항목_${meeting.meetingDate ?? '날짜미상'}.csv`
}

/**
 * 담당자. 마크다운과 같은 규칙입니다 —
 * 할 일인데 담당자가 없으면 빈칸이 아니라 "담당자 미정"입니다.
 * 엑셀에서 빈칸은 "안 적힌 것"과 "정해지지 않은 것"을 구별하지 못합니다.
 */
function assigneeCell(item: ProcessedItem): string {
  if (item.assignee) {
    const { nameRaw, contextRaw } = item.assignee
    return contextRaw ? `${nameRaw}(${contextRaw})` : nameRaw
  }
  return item.type === 'action' ? '담당자 미정' : ''
}

function csvRow(cells: readonly string[]): string {
  return cells.map(csvCell).join(',')
}

/**
 * RFC 4180 이스케이프.
 * 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고, 안쪽 따옴표는 두 번 씁니다.
 * 회의록 인용문에는 셋 다 흔하게 들어갑니다.
 */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
