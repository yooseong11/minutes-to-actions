/**
 * 회의록 추출 API — 아직 LLM을 붙이지 않은 확인용 껍데기.
 *
 * 이 단계의 목적은 하나입니다:
 *   Vercel에서 TypeScript 함수가 ../lib/*.ts 를 import 해서 도는가.
 * 그것만 확인되면 여기에 LLM 호출과 나머지 후처리를 채웁니다.
 *
 * 설계 원칙: AI는 발췌만, 계산·대조·판단은 코드가 한다.
 */
import { parseDue } from '../lib/date.js'
import { quoteExists } from '../lib/verify.js'

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

interface ExtractBody {
  /** 회의록 원문 */
  text: string
  /** 'YYYY-MM-DD' — 사용자가 화면에서 입력. 본문에 없을 수 있다 */
  meetingDate: string | null
  /** 아래 둘은 껍데기 단계 전용. LLM을 붙이면 AI 출력에서 온다 */
  dueDateRaw?: string | null
  anchorDateRaw?: string | null
  quote?: string | null
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

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
  if (typeof b.text !== 'string' || !b.text.trim() || b.text.length > 50_000) return null
  if (b.meetingDate != null && (typeof b.meetingDate !== 'string' || !DATE_KEY.test(b.meetingDate))) return null

  return {
    text: b.text,
    meetingDate: (b.meetingDate as string | undefined) ?? null,
    dueDateRaw: typeof b.dueDateRaw === 'string' ? b.dueDateRaw : null,
    anchorDateRaw: typeof b.anchorDateRaw === 'string' ? b.anchorDateRaw : null,
    quote: typeof b.quote === 'string' ? b.quote : null,
  }
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'POST 요청만 지원해요.' })
    return
  }

  const body = parseBody(req.body)
  if (!body) {
    res.status(400).json({ error: '회의록 본문과 회의 날짜(YYYY-MM-DD)를 확인해 주세요.' })
    return
  }

  // 지금은 LLM 없이, 코드 후처리 두 조각만 돌려서 배선을 확인한다.
  const due = parseDue(body.dueDateRaw, body.anchorDateRaw, body.meetingDate)
  const quoteOk = body.quote == null ? null : quoteExists(body.quote, body.text)

  res.status(200).json({
    stage: 'wiring-check',
    meetingDate: body.meetingDate,
    due,
    quoteOk,
    note: 'LLM 미연결. lib/*.ts import가 Vercel에서 도는지 확인하는 단계입니다.',
  })
}
