import { useState } from 'react'
import type { EditableItem, ItemPatch } from '../lib/edit.js'
import type { RawAttendee } from '../lib/types.js'
import ItemForm from './ItemForm.js'
import { ITEM_TYPE, REVIEW_REASON } from '../lib/labels.js'

/**
 * 항목 **한 줄**입니다. 카드가 아닙니다. (파일 이름은 이력 때문에 남아 있습니다)
 *
 * 왜 카드를 걷어냈나: 카드는 항목이 평면 목록이던 섹션 3~4의 흔적입니다.
 * 그때는 항목끼리 경계를 그어줄 게 상자밖에 없었습니다. 4.5에서 안건이 경계를
 * 대신 그어주게 됐는데 상자가 그대로 남아, 한 줄짜리 내용이 상자 세 겹
 * (안건 → 카드 → 원문 근거) 안에 들어가 있었습니다.
 *
 * 이 프로젝트의 원칙 **"배지는 예외에만 단다"**를 상자에도 적용한 것입니다.
 * 손댈 게 없는 항목은 아무 장식 없는 텍스트 한 줄입니다.
 *   ask 사유 있음   → 그 줄만 배경이 깔립니다. 사람이 채워야 하는 줄입니다
 *   warn 사유 있음  → 줄 끝에 작은 회색 글씨. 읽고 넘어가면 됩니다
 *   superseded      → 취소선. 배지가 아니라 항목의 상태입니다
 *
 * 전부 똑같이 생기면 손볼 항목이 어디인지 안 보입니다. 그게 이 앱의 주장인데.
 *
 * 코드가 환산한 값(기한·담당자) 옆에는 **원문 표현을 같이 둡니다.**
 * 환산이 틀렸을 때 원문이 없으면 틀린 걸 알아볼 방법이 없습니다.
 * 다만 상시 노출하지 않고 「근거」를 눌러 펼칩니다 — 대부분 content와 같은 문장입니다.
 */
export default function ItemCard({ item, attendees, onEdit, onDelete }: {
  item: EditableItem; attendees: RawAttendee[]; onEdit: (patch: ItemPatch) => void; onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)

  if (editing) {
    return (
      <li className="row row--editing">
        <ItemForm initial={item} attendees={attendees} onCancel={() => setEditing(false)} onSave={values => {
          const patch: ItemPatch = {}
          if (values.content !== item.content) patch.content = values.content
          if (values.type !== item.type) patch.type = values.type
          if (values.clearedFields?.includes('assignee') || JSON.stringify(values.assignee) !== JSON.stringify(item.assignee)) patch.assignee = values.assignee
          if (values.clearedFields?.includes('due') || values.due !== item.due) patch.due = values.due
          onEdit(patch)
          setEditing(false)
        }} />
      </li>
    )
  }

  const labels = item.reviewReasons.map((r) => REVIEW_REASON[r]).filter((r) => r !== undefined)
  const asks = labels.filter((r) => r.kind === 'ask')
  const warns = labels.filter((r) => r.kind === 'warn')
  const struck = item.reviewReasons.includes('superseded')
  const due = item.due ?? item.dueDateRaw
  const hasDetail = Boolean(item.quote || item.blockedByRaw || item.supersededQuote || item.assigneeCandidates.length)

  return (
    <li className={asks.length ? 'row row--ask' : 'row'}>
      <div className="row-line">
        <span className={`type-tag type-tag--${item.type}`}>{ITEM_TYPE[item.type]}</span>

        <p className={struck ? 'row-text superseded' : 'row-text'}>
          <Who item={item} />
          {item.content}
        </p>

        <span className="row-meta">
          {due && <span className="row-due">{due}</span>}
          {asks.map((b) => <span key={b.label} className="row-flag row-flag--ask">{b.label}</span>)}
          {warns.map((b) => <span key={b.label} className="row-flag">{b.label}</span>)}
        </span>

        <span className="row-actions">
          {hasDetail && (
            <button type="button" className="icon-button" aria-expanded={open}
              aria-label={open ? '근거 접기' : '원문 근거 보기'} title="원문 근거"
              onClick={() => setOpen(!open)}>
              <Icon path={open ? 'M3 5.5 7 9.5 11 5.5' : 'M5.5 3 9.5 7 5.5 11'} />
            </button>
          )}
          <button type="button" className="icon-button" aria-label="수정" title="수정"
            onClick={() => setEditing(true)}>
            <Icon path="M9.5 2.5 11.5 4.5 5 11H3V9zM8.2 3.8l2 2" />
          </button>
          <button type="button" className="icon-button icon-button--danger" aria-label="삭제" title="삭제"
            onClick={onDelete}>
            <Icon path="M3.5 3.5h7M5.5 3.5V2.5h3v1M4.5 3.5l.5 8h4l.5-8" />
          </button>
        </span>
      </div>

      {open && (
        <div className="row-detail">
          {item.quote && <blockquote className="row-quote">{item.quote}</blockquote>}
          {item.supersededQuote && <p className="row-note">뒤집힌 내용: “{item.supersededQuote}”</p>}
          {item.blockedByRaw && <p className="row-note">선행: {item.blockedByRaw}</p>}
          <Origin item={item} />
        </div>
      )}
    </li>
  )
}

/**
 * 아이콘. 글리프 문자(✎ ×)는 폰트에 따라 클립이나 곱셈기호로 보입니다.
 * 줄 오른쪽 끝의 작은 표식이라 모양이 흔들리면 무슨 버튼인지 알 수 없습니다.
 * currentColor를 쓰므로 다크 모드에서 색이 따라옵니다.
 */
function Icon({ path }: { path: string }) {
  return (
    <svg className="icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 줄 앞의 담당자. 할 일인데 비었으면 "담당자 미정"이라고 적습니다 — 빈칸은 정보가 아닙니다 */
function Who({ item }: { item: EditableItem }) {
  if (item.assignee) {
    return <span className="row-who">{item.assignee.nameRaw}{item.assignee.contextRaw ? `(${item.assignee.contextRaw})` : ''} — </span>
  }
  if (item.type === 'action') return <span className="row-who row-who--empty">담당자 미정 — </span>
  return null
}

/** 코드가 환산한 값의 원문 표현과 후보. 펼쳤을 때만 보입니다 */
function Origin({ item }: { item: EditableItem }) {
  const lines: string[] = []
  if (item.editedFields?.length || item.userCreated) {
    lines.push(item.userCreated ? '직접 추가한 항목입니다' : `사용자가 고친 칸: ${item.editedFields?.join(', ')}`)
  }
  if (item.assigneeRaw) lines.push(`담당자 원문 “${item.assigneeRaw}”`)
  if (item.dueDateRaw) {
    lines.push(
      `기한 원문 “${item.dueDateRaw}”` +
      (item.dueMethod === 'backward' && item.dueAnchor ? ` · ${item.dueAnchor} 기준 역산` : '') +
      (item.due === null ? ' · 환산 못 함' : ''),
    )
  }
  return (
    <>
      {lines.map((l) => <p key={l} className="row-note">{l}</p>)}
      {item.assigneeCandidates.length > 0 && (
        <p className="row-note">
          후보{' '}
          {item.assigneeCandidates.map((c) => (
            <span key={`${c.nameRaw}|${c.contextRaw ?? ''}`} className="assignee-candidate">
              {c.nameRaw}{c.contextRaw && ` (${c.contextRaw})`}
            </span>
          ))}
        </p>
      )}
    </>
  )
}
