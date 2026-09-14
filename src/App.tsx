import { useState } from 'react'
import { countReasons } from '../lib/labels.js'
import type { MeetingDateSource } from '../lib/postprocess.js'
import { SAMPLE_01, SAMPLE_01_TEXT } from './fixtures/sample01.js'
import ItemCard from './ItemCard.js'
import { useExtract } from './useExtract.js'
import './App.css'

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

/** 기준일을 어디서 가져왔는지 사람 말로. 조용히 오늘로 계산하고 넘어가지 않습니다 */
const DATE_SOURCE_LABEL: Record<MeetingDateSource, string> = {
  user: '고르신 날짜를 기준으로 계산했어요',
  document: '회의록 원문에 적힌 날짜를 기준으로 계산했어요',
  fallback: '원문에 회의 날짜가 없어서 오늘을 기준으로 계산했어요',
  none: '기준 날짜가 없어서 기한을 환산하지 못했어요',
}

export default function App() {
  const [text, setText] = useState('')
  // 사용자가 날짜칸을 직접 고쳤을 때만 값이 들어갑니다. 안 고쳤으면 null.
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const { state, extract, showResult } = useExtract()

  const loading = state.status === 'loading'

  // 날짜칸에 보이는 값: 고른 값 > 서버가 쓴 기준일 > 오늘.
  // 서버가 원문에서 9/8을 읽었으면 칸에도 9/8이 올라옵니다. 오늘로 남겨두면
  // 일주일 밀린 기한이 정상으로 보입니다 (실제로 그랬습니다).
  const resolvedDate = state.status === 'done' ? state.meeting.meetingDate : null
  const shownDate = pickedDate ?? resolvedDate ?? today()

  const submit = () => void extract(text, pickedDate, today())

  /** 더미 데이터. 개발 중 화면만 볼 때 토큰을 쓰지 않기 위한 것입니다. */
  const loadSample = () => {
    setText(SAMPLE_01_TEXT)
    setPickedDate(null)
    showResult(SAMPLE_01)
  }

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

          {/* 개발 중에만 보입니다. 프로덕션 빌드에서는 통째로 사라집니다.
              추출 버튼은 누를 때마다 OpenAI 토큰이 나갑니다. 화면만 고칠 때는 이쪽입니다. */}
          {import.meta.env.DEV && (
            <button className="button button--quiet" type="button" onClick={loadSample} disabled={loading}>
              더미 데이터 (01번)
            </button>
          )}
        </div>

        {state.status === 'error' && (
          <p className="error" role="alert">{state.message}</p>
        )}

        {state.status === 'done' && (
          <section className="result">
            <p className="summary">
              항목 {state.meeting.items.length}개
              {' · '}참석자 {state.meeting.attendees.length}명
              {' · '}손볼 항목 {state.meeting.items.filter((i) => i.confidence === 'needs_review').length}개
            </p>

            {/* 기한 환산은 전부 이 날짜를 기준으로 역산합니다.
                기준이 틀리면 기한이 조용히 다 틀리므로 숨기지 않습니다. */}
            <div className="anchor">
              <label className="anchor-label" htmlFor="meeting-date">
                {DATE_SOURCE_LABEL[state.meeting.meetingDateSource]}
              </label>
              <input
                id="meeting-date"
                className="anchor-input"
                type="date"
                value={shownDate}
                onChange={(e) => setPickedDate(e.target.value)}
              />
              <button className="button button--quiet" type="button" onClick={submit}>
                다시 계산
              </button>
              {/* 원문 표현과 실제 기준일이 다르면 그 사실을 남깁니다 */}
              {state.meeting.meetingDateRaw && state.meeting.meetingDateSource !== 'document' && (
                <span className="hint">원문에는 “{state.meeting.meetingDateRaw}”라고 적혀 있어요.</span>
              )}
            </div>

            {state.meeting.items.length === 0 ? (
              <p className="empty">항목이 하나도 나오지 않았어요. 원문을 확인해 주세요.</p>
            ) : (
              <div className="items">
                {state.meeting.items.map((it) => (
                  <ItemCard key={it.id} item={it} />
                ))}
              </div>
            )}

            <details className="excluded">
              <summary className="excluded-summary">
                원문 대조 실패로 제외됨 {state.meeting.rejected.length}건
              </summary>
              <p className="excluded-note">
                인용문이 원문에 없어 항목에서 뺀 것들입니다. 대부분은 지어낸 내용이지만,
                줄바꿈 차이 때문에 멀쩡한 항목이 걸리기도 합니다. 조용히 버리면
                액션아이템 하나가 사라진 걸 모르게 되므로 내용까지 남겨둡니다.
              </p>
              {state.meeting.rejected.map((r, i) => (
                <div className="rejected-item" key={`${r.item.quote}|${i}`}>
                  <p className="rejected-content">{r.item.content || '(내용 없음)'}</p>
                  <p className="rejected-quote">
                    원문에 없던 {r.hallucinated.join(' / ')}: “{r.item.quote}”
                  </p>
                </div>
              ))}
            </details>

            {/* 카드가 틀렸을 때 대조할 원본. 접어 두되 지우지 않습니다 */}
            <details className="raw-wrap">
              <summary className="raw-summary">후처리 결과 원본 (JSON)</summary>
              <pre className="raw">{JSON.stringify(state.meeting, null, 2)}</pre>
            </details>
          </section>
        )}

        <section className="legend">
          <h2 className="legend-title">표시 규칙</h2>
          <span className="badge badge--warn">확인 필요</span>
          <span className="badge badge--ask">입력 필요</span>
          <span className="superseded">번복됨</span>
          <p className="legend-note">
            표시가 없으면 그대로 저장됩니다. 확인 필요({countReasons('warn')}종)는 읽고 넘어가면 되고,
            입력 필요({countReasons('ask')}종)는 빈칸을 채워야 저장됩니다.
          </p>
        </section>
      </main>
    </div>
  )
}
