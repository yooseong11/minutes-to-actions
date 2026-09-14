import { useCallback, useRef, useState } from 'react'
import type { ProcessedMeeting } from '../lib/postprocess.js'

/**
 * POST /api/extract 호출 훅.
 *
 * 원칙 하나: 에러 문구를 여기서 만들지 않는다.
 * 서버가 상태코드마다 한국어 문구를 이미 { error } 로 내려준다.
 * 여기서 문구를 다시 쓰면 서버를 고칠 때 두 군데를 고쳐야 하고,
 * 반드시 한쪽을 잊는다. 여기 있는 문구는 '서버에 닿지도 못한 경우'뿐이다.
 *
 * 주소는 항상 '/api/extract' 하나다.
 * 개발 중에는 vite.config.ts 의 프록시가 배포된 함수로 넘기고,
 * 배포되면 같은 도메인이라 그대로 맞는다.
 */

export type ExtractState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; meeting: ProcessedMeeting; resultId: number }
  | { status: 'error'; message: string }

/** api/extract.ts 의 MAX_TEXT 와 같은 값. 왕복하지 않고 미리 막는다 */
const MAX_TEXT = 20_000

const FALLBACK = {
  empty: '회의록을 붙여넣어 주세요.',
  tooLong: `회의록이 너무 길어요. ${MAX_TEXT.toLocaleString()}자 이하로 나눠서 넣어 주세요.`,
  offline: '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.',
  unreadable: '서버가 예상과 다른 응답을 보냈어요. 잠시 후 다시 시도해 주세요.',
} as const

interface ErrorBody {
  error?: unknown
}

/** 서버가 준 문구를 쓰고, 못 읽으면 그때만 대신 채운다 */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody
    if (typeof body.error === 'string' && body.error) return body.error
  } catch {
    // JSON 이 아니다 — Vercel 이 HTML 오류 페이지를 준 경우
  }
  return FALLBACK.unreadable
}

export function useExtract() {
  const [state, setState] = useState<ExtractState>({ status: 'idle' })
  const resultSequence = useRef(0)
  const inFlight = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    inFlight.current?.abort()
    inFlight.current = null
    setState({ status: 'idle' })
  }, [])

  /**
   * @param meetingDate  사용자가 날짜칸을 직접 고쳤을 때만 값. 안 고쳤으면 null
   * @param fallbackDate 오늘. 원문에도 날짜가 없을 때만 서버가 쓴다
   */
  const extract = useCallback(async (text: string, meetingDate: string | null, fallbackDate: string | null) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setState({ status: 'error', message: FALLBACK.empty })
      return
    }
    if (trimmed.length > MAX_TEXT) {
      setState({ status: 'error', message: FALLBACK.tooLong })
      return
    }

    // 연타로 보낸 이전 요청은 버린다. 늦게 온 응답이 새 결과를 덮지 않도록
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller

    setState({ status: 'loading' })

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: trimmed, meetingDate, fallbackDate }),
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      if (!response.ok) {
        setState({ status: 'error', message: await readErrorMessage(response) })
        return
      }

      const meeting = (await response.json()) as ProcessedMeeting
      if (controller.signal.aborted) return
      setState({ status: 'done', meeting, resultId: ++resultSequence.current })
    } catch (error) {
      // 사용자가 다시 눌러서 버린 요청은 에러가 아니다
      if (error instanceof DOMException && error.name === 'AbortError') return
      setState({ status: 'error', message: FALLBACK.offline })
    } finally {
      if (inFlight.current === controller) inFlight.current = null
    }
  }, [])

  /**
   * 서버를 거치지 않고 결과를 그대로 앉힙니다. **개발 중 더미 데이터용입니다.**
   * 진행 중인 요청이 있으면 버립니다 — 늦게 온 응답이 더미를 덮으면 안 됩니다.
   */
  const showResult = useCallback((meeting: ProcessedMeeting) => {
    inFlight.current?.abort()
    inFlight.current = null
    setState({ status: 'done', meeting, resultId: ++resultSequence.current })
  }, [])

  return { state, extract, reset, showResult }
}
