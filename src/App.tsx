import type { ReviewReason } from '../lib/types.js'
import './App.css'

/**
 * 섹션 3 껍데기. 화면 로직은 아직 없습니다.
 * 여기 있는 것은 두 가지를 증명하기 위한 최소한입니다.
 *   1. src/ 에서 lib/ 의 타입을 그대로 import 할 수 있다
 *   2. tokens.css 의 상태 색이 실제로 먹는다
 */

/** 인수인계 문서의 "화면 처리" 표를 그대로 옮긴 것 */
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
          <span className="badge badge--warn">확인만 하면 됨</span>
          <span className="badge badge--ask">답을 달라</span>
          <span className="badge badge--reject">환각으로 탈락</span>
          <span className="superseded">번복된 결정</span>
          <p className="legend-note">
            사유 {Object.keys(BADGE_STYLE).length}종 중 되묻기{' '}
            {Object.values(BADGE_STYLE).filter((v) => v === 'ask').length}종,
            배지 {Object.values(BADGE_STYLE).filter((v) => v === 'warn').length}종.
          </p>
        </section>
      </main>
    </div>
  )
}
