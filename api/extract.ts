/**
 * 회의록 추출 API.
 *
 * 얇게 유지한다 — 요청 검증 → LLM 호출 → lib 후처리 → 응답.
 * 계산·대조·판단은 전부 lib/ 안에 있고, 여기에는 넣지 않는다.
 *
 * 설계 원칙: AI는 발췌만, 계산·대조·판단은 코드가 한다.
 */
import { postprocess, type ProcessedMeeting } from '../lib/postprocess.js'
import { EXTRACTION_SCHEMA, SYSTEM_PROMPT, buildUserMessage } from '../lib/prompt.js'
import type { RawExtraction } from '../lib/types.js'

// @vercel/node를 의존성으로 들이지 않기 위해 필요한 부분만 선언한다.
interface VercelRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}
interface VercelResponse {
  status(code: number): VercelResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

export const config = { maxDuration: 60 }

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT = 20_000

interface ExtractBody {
  text: string
  /** 사용자가 화면에서 직접 고른 회의 날짜. 안 골랐으면 null */
  meetingDate: string | null
  /** 프론트가 채워 보낸 오늘. 원문에도 날짜가 없을 때만 쓴다 */
  fallbackDate: string | null
}

function parseBody(raw: unknown): ExtractBody | null {
  let body: unknown = raw
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return null
    }
  }
  if (typeof body !== 'object' || body === null) return null

  const b = body as Record<string, unknown>
  if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > MAX_TEXT) return null
  if (b.meetingDate != null && (typeof b.meetingDate !== 'string' || !DATE_KEY.test(b.meetingDate))) return null
  if (b.fallbackDate != null && (typeof b.fallbackDate !== 'string' || !DATE_KEY.test(b.fallbackDate))) return null

  return {
    text: b.text,
    meetingDate: (b.meetingDate as string | undefined) ?? null,
    fallbackDate: (b.fallbackDate as string | undefined) ?? null,
  }
}

/** AI 응답이 스키마 모양인지 최소한만 본다. 내용 검증은 postprocess가 한다 */
function isRawExtraction(value: unknown): value is RawExtraction {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.attendeesRaw) && Array.isArray(v.items)
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'POST 요청만 지원해요.' })
    return
  }

  // 공유 키가 설정돼 있으면 요구한다. 없으면 열어 둔다 (1차 범위)
  const sharedKey = process.env.EXTRACT_SHARED_KEY
  if (sharedKey && req.headers['x-extract-key'] !== sharedKey) {
    res.status(401).json({ error: '접근 키가 필요해요.' })
    return
  }

  const body = parseBody(req.body)
  if (!body) {
    res.status(400).json({ error: `회의록 본문(1~${MAX_TEXT}자)과 회의 날짜(YYYY-MM-DD)를 확인해 주세요.` })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: '아직 설정되지 않았어요. 서버 환경 변수를 확인해 주세요.' })
    return
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 기본값은 Vercel에 OPENAI_MODEL을 안 넣었을 때만 쓰인다
        model: process.env.OPENAI_MODEL || 'gpt-6-astra',
        store: false,
        instructions: SYSTEM_PROMPT,
        // 사용자가 고른 날짜만 넘긴다. 오늘 날짜를 '회의 날짜'라고 알려주면
        // AI가 원문 대신 그걸 meetingDateRaw로 베껴 쓴다.
        input: buildUserMessage(body.text, body.meetingDate),
        // 추론 강도. 항목이 발화 단위로 잘게 쪼개지는 것이 추론 부족 때문인지
        // 프롬프트 때문인지 가르려고, **프롬프트는 그대로 두고 이 값만** 올렸다.
        // Vercel에 OPENAI_REASONING_EFFORT를 넣으면 코드 수정 없이 되돌릴 수 있다.
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || 'high' },
        // 추론 토큰도 이 한도 안에서 쓰인다. effort만 올리고 이걸 안 올리면
        // 추론이 한도를 먹고 출력이 잘려 status가 'completed'로 안 온다.
        max_output_tokens: 24_000,
        text: { format: { type: 'json_schema', name: 'meeting_extraction', strict: true, schema: EXTRACTION_SCHEMA } },
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!response.ok) {
      res.status(response.status === 429 ? 429 : 502).json({
        error:
          response.status === 429
            ? 'AI 요청이 많아요. 잠시 후 다시 시도해 주세요.'
            : 'AI가 응답하지 못했어요. 잠시 후 다시 시도해 주세요.',
      })
      return
    }

    const result = (await response.json()) as {
      status?: string
      output?: { content?: { type: string; text?: string }[] }[]
    }
    const content = (result.output ?? []).flatMap((o) => o.content ?? [])
    if (content.some((c) => c.type === 'refusal')) {
      res.status(422).json({ error: '이 입력에서 항목을 추출할 수 없어요.' })
      return
    }
    if (result.status !== 'completed') {
      res.status(502).json({ error: 'AI 응답이 완성되지 않았어요. 회의록을 나눠서 넣어 주세요.' })
      return
    }

    let raw: unknown
    try {
      raw = JSON.parse(
        content
          .filter((c) => c.type === 'output_text')
          .map((c) => c.text ?? '')
          .join(''),
      )
    } catch {
      res.status(502).json({ error: 'AI가 만든 형식이 올바르지 않아요. 다시 시도해 주세요.' })
      return
    }
    if (!isRawExtraction(raw)) {
      res.status(502).json({ error: 'AI가 만든 형식이 올바르지 않아요. 다시 시도해 주세요.' })
      return
    }

    // 여기서부터가 이 프로젝트의 본체 — 코드가 검사하고 계산하고 대조한다
    // 기준일 우선순위(사용자 지정 > 원문 > 오늘)는 postprocess 한 곳에만 있다
    const meeting: ProcessedMeeting = postprocess(raw, body.text, body.meetingDate, body.fallbackDate)

    res.status(200).json(meeting)
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? '응답 시간이 길어졌어요. 회의록을 나눠서 넣어 주세요.'
        : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    })
  }
}
