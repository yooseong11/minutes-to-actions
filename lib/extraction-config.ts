/**
 * 회의록 추출 요청 설정.
 *
 * 실제 시스템 프롬프트는 extract-prompt.md에 두고, 이 모듈은 프롬프트 로딩,
 * Structured Outputs 스키마, 사용자 입력 조립을 담당한다.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const EXTRACTION_PROMPT_PATH = join(process.cwd(), 'lib', 'extract-prompt.md')

/** OpenAI Responses API의 instructions에 전달하는 실제 추출 프롬프트 */
export const EXTRACTION_PROMPT = readFileSync(EXTRACTION_PROMPT_PATH, 'utf8').trim()

const REVIEW_REASONS = [
  'no_assignee',
  'assignee_unknown',
  'assignee_unmatched',
  'duplicate_name',
  'due_unparseable',
  'unit_unclear',
  'superseded',
  'blocked',
  'conditional',
  'ambiguous_intent',
] as const

/** 항목 하나의 스키마. 안건 안에 중첩된다 */
const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'type',
    'content',
    'assigneeRaw',
    'assigneeContextRaw',
    'dueDateRaw',
    'anchorDateRaw',
    'blockedByRaw',
    'reviewReasons',
    'quote',
    'supersededQuote',
  ],
  properties: {
    type: { enum: ['decision', 'action', 'open'] },
    content: { type: 'string' },
    assigneeRaw: { type: ['string', 'null'] },
    assigneeContextRaw: { type: ['string', 'null'] },
    dueDateRaw: { type: ['string', 'null'] },
    anchorDateRaw: { type: ['string', 'null'] },
    blockedByRaw: { type: ['string', 'null'] },
    reviewReasons: { type: 'array', items: { enum: REVIEW_REASONS } },
    quote: { type: 'string' },
    supersededQuote: { type: ['string', 'null'] },
  },
} as const

/** OpenAI Structured Outputs에서 강제하는 회의록 추출 결과 스키마 */
export const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'meetingDateRaw',
    'meetingTimeRaw',
    'meetingPlaceRaw',
    'purposeRaw',
    'attendeesRaw',
    'agendas',
  ],
  properties: {
    meetingDateRaw: { type: ['string', 'null'] },
    meetingTimeRaw: { type: ['string', 'null'] },
    meetingPlaceRaw: { type: ['string', 'null'] },
    purposeRaw: { type: ['string', 'null'] },
    attendeesRaw: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nameRaw', 'contextRaw'],
        properties: {
          nameRaw: { type: 'string' },
          contextRaw: { type: ['string', 'null'] },
        },
      },
    },
    agendas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary', 'items'],
        properties: {
          title: { type: 'string' },
          summary: { type: ['string', 'null'] },
          items: { type: 'array', items: ITEM_SCHEMA },
        },
      },
    },
  },
} as const

export function buildExtractionInput(text: string, meetingDate: string | null): string {
  return `회의 날짜: ${meetingDate ?? '(입력 없음)'}\n\n--- 회의록 ---\n${text}`
}
