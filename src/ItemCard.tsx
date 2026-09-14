import { useState } from 'react'
import type { EditableItem, ItemPatch } from '../lib/edit.js'
import type { RawAttendee } from '../lib/types.js'
import ItemForm from './ItemForm.js'
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
 * 수정한 값은 원문 근거와 구분하고, 삭제한 필드는 미지정으로 표시합니다.
 */
export default function ItemCard({ item, attendees, onEdit, onDelete }: {
  item: EditableItem; attendees: RawAttendee[]; onEdit: (patch: ItemPatch) => void; onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  if (editing) return <article className="item">
    <ItemForm initial={item} attendees={attendees} onCancel={() => setEditing(false)} onSave={values => {
      const patch: ItemPatch = {}
      if (values.content !== item.content) patch.content = values.content
      if (values.type !== item.type) patch.type = values.type
      if (JSON.stringify(values.assignee) !== JSON.stringify(item.assignee)) patch.assignee = values.assignee
      if (values.due !== item.due) patch.due = values.due
      onEdit(patch)
      setEditing(false)
    }} />
    {item.quote && <p className="item-quote-text">원문 근거: {item.quote}</p>}
  </article>
  const badges = item.reviewReasons
    .map((r) => REVIEW_REASON[r])
    .filter((r) => r !== undefined && r.kind !== 'strike')

  const struck = item.reviewReasons.includes('superseded')

  return (
    <article className="item">
      <div className="item-toolbar">
        <span className="hint">{item.userCreated ? '직접 추가한 안건' : item.editedFields?.length ? '사용자가 수정한 안건' : ''}</span>
        <div className="actions">
          <button type="button" className="button button--quiet" onClick={() => setEditing(true)}>수정</button>
          <button type="button" className="button button--quiet" onClick={onDelete}>안건 삭제</button>
        </div>
      </div>
      <p className={struck ? 'item-content superseded' : 'item-content'}>{item.content}</p>

      <dl className="fields">
        <div className="field">
          <dt className="field-key">담당자</dt>
          <dd className="field-value">
            <Assignee item={item} />
            {(item.assignee || ((item.assigneeRaw || item.assigneeCandidates.length > 0) && !item.editedFields?.includes('assignee'))) ?
              <button type="button" className="button button--quiet" onClick={() => onEdit({ assignee: null })}>담당자 삭제</button> : null}
          </dd>
        </div>

        <div className="field">
          <dt className="field-key">기한</dt>
          <dd className="field-value">
            <Due item={item} />
            {(item.due || (item.dueDateRaw && !item.editedFields?.includes('due'))) &&
              <button type="button" className="button button--quiet" onClick={() => onEdit({ due: null })}>기한 삭제</button>}
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
      {item.quote && <details className="item-quote">
        <summary className="item-quote-summary">원문 근거</summary>
        <p className="item-quote-text">{item.quote}</p>
      </details>}
    </article>
  )
}

/** 확정된 담당자 > 원문 표현 + 후보 > 없음 */
function Assignee({ item }: { item: EditableItem }) {
  if (item.editedFields?.includes('assignee') || item.userCreated) return <>
    {item.assignee ? `${item.assignee.nameRaw}${item.assignee.contextRaw ? ` (${item.assignee.contextRaw})` : ''}` : <span className="field-empty">미지정</span>}
    <span className="field-raw">사용자 입력</span>
  </>
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
function Due({ item }: { item: EditableItem }) {
  if (item.editedFields?.includes('due') || item.userCreated) return <>
    {item.due ?? <span className="field-empty">미지정</span>}
    <span className="field-raw">사용자 입력{item.dueDateRaw ? ` · 원문 “${item.dueDateRaw}”` : ''}</span>
  </>
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
