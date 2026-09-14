import { useState } from 'react'
import type { ReviewReason } from '../lib/types.js'
import { useExtract } from './useExtract.js'
import './App.css'

/**
 * 섹션 3 — 붙여넣기 → 추출 → 결과.
 * 결과는 아직 날것(JSON)으로 보여줍니다. 항목 렌더는 다음 단계입니다.
 *
 * 회의 날짜는 묻지 않고 오늘로 보냅니다. 회의 직후에 쓰는 게 보통이고,
 * 붙여넣기 전에 날짜부터 고르게 하면 쓰기 싫어집니다.
 * 대신 "어느 날짜로 계산했는지"를 결과에 드러내고 거기서 고칠 수 있게 합니다.
 *
 * 배지는 예외에만 답니다. 손댈 게 없는 항목은 아무 표시도 하지 않습니다.
 *   (표시 없음) — 기본. 그대로 저장된다
 *   확인 필요   — 사람이 읽어야 함. 그래도 저장은 된다
 *   입력 필요   — 사람이 빈칸을 채워야 저장이 된다
 */
/**
 * 오늘 날짜를 'YYYY-MM-DD' 로.
 * toISOString() 을 쓰면 안 됩니다 — UTC 로 바꿔서 한국 시간 오전에는 전날이 나옵니다.
 */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const BADGE_STYLE: Record<ReviewReason, 'warn' | 'ask'> = {
  no_assignee: 'ask',
  assignee_unknown: 'ask',
  assignee_unmatched: 'ask',
  duplicate_name: 'ask',
  unit_unclear: 'ask',
  due_unparseable: 'warn',
  blocked: 'warn',
  conditional: 'warn',
  ambiguous_intent: 'warn',
  superseded: 'warn',
}

export default function App() {
  const [text, setText] = useState('')
  const [meetingDate, setMeetingDate] = useState(today())
  const { state, extract } = useExtract()

  const loading = state.status === 'loading'
  const ask = Object.values(BADGE_STYLE).filter((v) => v === 'ask').length
  const warn = Object.values(BADGE_STYLE).length - ask

  const submit = () => void extract(text, meetingDate)

  return (
    <div className="page">
      <header className="header">
        <h1 className="title">회의록 추출기</h1>
        <p className="subtitle">회의록을 붙여넣으면 결정·액션아이템으로 나눕니다.</p>
      </header>

      <main className="main">
        <label className="label" htmlFor="minutes">회의록 원문</label>
        <textarea
          id="minutes"
          className="input"
          placeholder="여기에 붙여넣으세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />

        <div className="actions">
          <button className="button" type="button" onClick={submit} disabled={loading}>
            {loading ? '추출하는 중…' : '추출하기'}
          </button>
          {loading && <span className="hint">최대 45초 걸릴 수 있어요.</span>}
        </div>

        {state.status === 'error' && (
          <p className="error" role="alert">{state.message}</p>
        )}

        {state.status === 'done' && (
          <section className="result">
            <p className="summary">
              항목 {state.meeting.items.length}개
              {' · '}참석자 {state.meeting.attendees.length}명
            </p>

            {/* 기한 환산은 전부 이 날짜를 기준으로 역산합니다.
                기준이 틀리면 기한이 조용히 다 틀리므로 숨기지 않습니다. */}
            <div className="anchor">
              <label className="anchor-label" htmlFor="meeting-date">
                이 날짜를 기준으로 계산했어요
              </label>
              <input
                id="meeting-date"
                className="anchor-input"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
              <button className="button button--quiet" type="button" onClick={submit}>
                다시 계산
              </button>
            </div>

            <details className="excluded">
              <summary className="excluded-summary">
                원문 대조 실패로 제외됨 {state.meeting.rejected.length}건
              </summary>
              <p className="excluded-note">
                인용문이 원문에 없어 항목에서 뺀 것들입니다. 대부분은 지어낸 내용이지만,
                줄바꿈 차이 때문에 멀쩡한 항목이 걸리기도 합니다. 조용히 버리면
                액션아이템 하나가 사라진 걸 모르게 되므로 건수를 남겨둡니다.
              </p>
            </details>

            {/* 항목 렌더는 다음 단계. 지금은 후처리 결과를 그대로 봅니다 */}
            <pre className="raw">{JSON.stringify(state.meeting, null, 2)}</pre>
          </section>
        )}

        <section className="legend">
          <h2 className="legend-title">표시 규칙</h2>
          <span className="badge badge--warn">확인 필요</span>
          <span className="badge badge--ask">입력 필요</span>
          <span className="superseded">번복됨</span>
          <p className="legend-note">
            표시가 없으면 그대로 저장됩니다. 확인 필요({warn}종)는 읽고 넘어가면 되고,
            입력 필요({ask}종)는 빈칸을 채워야 저장됩니다.
          </p>
        </section>
      </main>
    </div>
  )
}
