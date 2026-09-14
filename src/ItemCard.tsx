import type { ProcessedItem } from '../lib/postprocess.js'
import { REVIEW_REASON } from '../lib/labels.js'

/**
 * 항목 카드 하나.
 *
 * 규칙 (extract-prompt.md "화면 처리"):
 *   - 배지는 예외에만 답니다. 손댈 게 없으면 아무 표시도 하지 않습니다.
 *   - `superseded`는 배지가 아니라 취소선입니다. 항목의 상태이지 할 일이 아닙니다.
 *   - 코드가 환산한 값(기한·담당자) 옆에 **원문 표현을 같이 둡니다.**
 *     환산이 틀렸을 때 원문이 없으면 틀린 걸 알아볼 방법이 없습니다.
 *
 * 분류(결정/할 일/미결)는 여기서 안 그립니다. 섹션 제목이 이미 말하고 있습니다.
 *
 * 되묻기(빈칸 채우기)는 섹션 4입니다. 여기서는 "무엇을 물어봐야 하는지"까지만 보여줍니다.
 */
export default function ItemCard({ item }: { item: ProcessedItem }) {
  const badges = item.reviewReasons
    .map((r) => REVIEW_REASON[r])
    .filter((r) => r !== undefined && r.kind !== 'strike')

  const struck = item.reviewReasons.includes('superseded')

  return (
    <article className="item">
      <p className={struck ? 'item-content superseded' : 'item-content'}>{item.content}</p>

      <dl className="fields">
        <div className="field">
          <dt className="field-key">담당자</dt>
          <dd className="field-value">
            <Assignee item={item} />
          </dd>
        </div>

        <div className="field">
          <dt className="field-key">기한</dt>
          <dd className="field-value">
            <Due item={item} />
          </dd>
        </div>

        {item.blockedByRaw && (
          <div className="field">
            <dt className="field-key">선행</dt>
            <dd className="field-value">{item.blockedByRaw}</dd>
          </div>
        )}
      </dl>

      {badges.length > 0 && (
        <div className="badges">
          {badges.map((b) => (
            <span key={b.label} className={`badge badge--${b.kind}`}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {item.supersededQuote && (
        <p className="item-note">뒤집힌 내용: “{item.supersededQuote}”</p>
      )}

      {/* 근거 인용문. 접어 두되 지우지는 않습니다 — 이 항목이 어디서 나왔는지가 근거입니다 */}
      <details className="item-quote">
        <summary className="item-quote-summary">원문 근거</summary>
        <p className="item-quote-text">{item.quote}</p>
      </details>
    </article>
  )
}

/** 확정된 담당자 > 원문 표현 + 후보 > 없음 */
function Assignee({ item }: { item: ProcessedItem }) {
  if (item.assignee) {
    return (
      <>
        {item.assignee.nameRaw}
        {item.assignee.contextRaw && <span className="field-raw">({item.assignee.contextRaw})</span>}
      </>
    )
  }

  if (item.assigneeCandidates.length > 0) {
    return (
      <>
        <span className="field-empty">—</span>
        {item.assigneeRaw && <span className="field-raw">원문 “{item.assigneeRaw}”</span>}
        <span className="chips">
          {item.assigneeCandidates.map((c) => (
            <span
              key={`${c.nameRaw}|${c.contextRaw ?? ''}`}
              className={item.preselect ? 'chip chip--preselect' : 'chip'}
            >
              {c.nameRaw}
              {c.contextRaw && ` (${c.contextRaw})`}
            </span>
          ))}
        </span>
      </>
    )
  }

  return (
    <>
      <span className="field-empty">—</span>
      {item.assigneeRaw && <span className="field-raw">원문 “{item.assigneeRaw}”</span>}
    </>
  )
}

/** 코드가 환산한 날짜 + 원문 표현. 역산이면 기준일까지 */
function Due({ item }: { item: ProcessedItem }) {
  if (!item.dueDateRaw) return <span className="field-empty">—</span>

  if (item.due === null) {
    return (
      <>
        <span className="field-empty">환산 못 함</span>
        <span className="field-raw">원문 “{item.dueDateRaw}”</span>
      </>
    )
  }

  return (
    <>
      {item.due}
      <span className="field-raw">
        원문 “{item.dueDateRaw}”
        {item.dueMethod === 'backward' && item.dueAnchor && ` · ${item.dueAnchor} 기준 역산`}
      </span>
    </>
  )
}
