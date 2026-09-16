import { useState } from 'react'
import { SAMPLE_01, SAMPLE_01_TEXT } from './fixtures/sample01.js'
import MeetingEditor from './MeetingEditor.js'
import { useExtract } from './useExtract.js'
import './App.css'

const MAX_TEXT_LENGTH = 700

/**
 * 섹션 3 — 붙여넣기 → 추출 → 결과.
 *
 * 회의 날짜는 붙여넣기 전에 묻지 않습니다. 날짜부터 고르게 하면 쓰기 싫어집니다.
 * 대신 기준일 출처를 셋으로 나눠 서버가 정합니다 — 사용자 지정 > 원문 > 오늘.
 * 화면은 오늘을 '회의 날짜'라고 우기지 않고 fallbackDate로만 보냅니다.
 * 원문에 날짜가 적혀 있으면 그쪽이 이기고, 결과의 기준일이 날짜칸에 올라옵니다.
 * 사용자가 날짜칸을 건드린 순간부터는 사용자 값이 무조건 이깁니다.
 *
 * 배지는 예외에만 답니다. 손댈 게 없는 항목은 아무 표시도 하지 않습니다.
 *   (표시 없음) — 기본. 그대로 저장된다
 *   확인 필요   — 사람이 읽어야 함. 그래도 저장은 된다
 *   입력 필요   — 사람이 보완할 수 있다. 모르면 미지정으로 남긴다
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

export default function App() {
  const [text, setText] = useState('')
  const { state, extract, showResult } = useExtract()

  const loading = state.status === 'loading'

  const submit = () => void extract(text, null, today())

  /** 더미 데이터. 개발 중 화면만 볼 때 토큰을 쓰지 않기 위한 것입니다. */
  const loadSample = () => {
    setText(SAMPLE_01_TEXT)
    showResult(SAMPLE_01)
  }

  return (
    <div className="page">
      <header className="header">
        <h1 className="title">AI 회의록 요약 추출기</h1>
      </header>

      <main className="main">
        <label className="label" htmlFor="minutes">현재 700자까지만 요약을 지원합니다.</label>
        <div className="input-group">
          <textarea
            id="minutes"
            className="input"
            placeholder="여기에 붙여넣으세요"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            aria-describedby="minutes-count"
            disabled={loading}
          />
          <output id="minutes-count" className="character-count" htmlFor="minutes">
            {text.length} / {MAX_TEXT_LENGTH}자
          </output>
        </div>

        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={submit}
            disabled={loading}
            aria-busy={loading}
          >
            {/* 스피너는 장식입니다. 상태는 버튼 글자와 aria-busy가 말합니다 —
                읽어주는 화면에는 도는 그림이 안 보이므로 aria-hidden으로 뺍니다. */}
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? '추출하는 중…' : '추출하기'}
          </button>
          {loading && <span className="hint">최대 55초 걸릴 수 있어요.</span>}

          
          
            <button className="button button--quiet" type="button" onClick={loadSample} disabled={loading}>
              더미 데이터 (01번)
            </button>
          
        </div>

        {state.status === 'error' && (
          <p className="error" role="alert">{state.message}</p>
        )}

        {state.status === 'done' && (
          <MeetingEditor key={state.resultId} meeting={state.meeting} />
        )}
      </main>
    </div>
  )
}
