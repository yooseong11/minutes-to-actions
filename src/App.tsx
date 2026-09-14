import type { ReviewReason } from '../lib/types.js'
import './App.css'

/**
 * 섹션 3 껍데기. 화면 로직은 아직 없습니다.
 * 여기 있는 것은 두 가지를 증명하기 위한 최소한입니다.
 *   1. src/ 에서 lib/ 의 타입을 그대로 import 할 수 있다
 *   2. tokens.css 의 상태 색이 실제로 먹는다
 *
 * 배지는 예외에만 답니다. 손댈 게 없는 항목은 아무 표시도 하지 않습니다.
 *   (표시 없음) — 기본. 그대로 저장된다
 *   확인 필요   — 사람이 읽어야 함. 그래도 저장은 된다
 *   입력 필요   — 사람이 빈칸을 채워야 저장이 된다
 */
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
  const ask = Object.values(BADGE_STYLE).filter((v) => v === 'ask').length
  const warn = Object.values(BADGE_STYLE).length - ask

  return (
    <div className="page">
      <header className="header">
        <h1 className="title">회의록 추출기</h1>
        <p className="subtitle">회의록을 붙여넣으면 결정·액션아이템으로 나눕니다.</p>
      </header>

      <main className="main">
        <label className="label" htmlFor="minutes">회의록 원문</label>
        <textarea id="minutes" className="input" placeholder="여기에 붙여넣으세요" />
        <button className="button" type="button">추출하기</button>

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

        <details className="excluded">
          <summary className="excluded-summary">원문 대조 실패로 제외됨 0건</summary>
          <p className="excluded-note">
            인용문이 원문에 없어 항목에서 뺀 것들입니다. 대부분은 지어낸 내용이지만,
            줄바꿈 차이 때문에 멀쩡한 항목이 걸리기도 합니다. 조용히 버리면
            액션아이템 하나가 사라진 걸 모르게 되므로 건수만 남겨둡니다.
          </p>
        </details>
      </main>
    </div>
  )
}
