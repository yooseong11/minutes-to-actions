import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../../lib/labels.js'
import type { AgendaValues, EditableItem } from '../../lib/edit.js'
import ItemCard from '../ItemCard.js'
import useCancelOnOutside from '../ui/useCancelOnOutside.js'

/** 안건 안에서 항목을 읽는 순서. 결정 → 할 일 → 미결 (SECTIONS가 단일 출처) */
const TYPE_ORDER = SECTIONS.map((s) => s.type)

/** 안건 안에서만 정렬합니다. 안건끼리의 순서는 회의에서 나온 순서 그대로 둡니다 */
function sortByType(items: EditableItem[]): EditableItem[] {
  return [...items].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
}

/**
 * 안건 하나. 제목 → 요약 → 항목 순입니다.
 *
 * 항목이 하나도 안 남은 안건도 지우지 않습니다. AI가 안건이라고 본 화제인데
 * 항목이 전부 환각으로 걸러졌다면, 그 사실이 화면에 남아야 합니다.
 */
export default function Agenda({
  title, summary, items, onSave, onDeleteAgenda, onEdit, onDelete, onAdd,
}: {
  title: string
  summary: string | null
  items: EditableItem[]
  onSave: (values: AgendaValues) => void
  onDeleteAgenda: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
  /** 받자마자 정렬합니다. 안건 안의 읽는 순서는 이 파일이 책임집니다 */
  const sorted = sortByType(items)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftSummary, setDraftSummary] = useState(summary ?? '')
  const [error, setError] = useState('')
  const titleInput = useRef<HTMLInputElement>(null)
  const focusTarget = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const stopEditing = useCallback(() => {
    setEditing(false)
    setError('')
  }, [])
  const formRef = useCancelOnOutside(editing, stopEditing)

  useEffect(() => {
    if (editing) (focusTarget.current ?? titleInput.current)?.focus()
  }, [editing])

  function startEditing(target?: HTMLInputElement | HTMLTextAreaElement) {
    focusTarget.current = target ?? null
    setDraftTitle(title)
    setDraftSummary(summary ?? '')
    setError('')
    setEditing(true)
  }

  const shownTitle = editing ? draftTitle : title
  const shownSummary = editing ? draftSummary : (summary ?? '')

  return (
    <section className="agenda">
      <form
        ref={formRef}
        className={editing ? 'agenda-editor agenda-editor--editing' : 'agenda-editor'}
        onSubmit={event => {
          event.preventDefault()
          if (!editing) return
          if (!draftTitle.trim()) {
            setError('안건 제목을 입력해 주세요.')
            return
          }
          onSave({ title: draftTitle, summary: draftSummary })
          stopEditing()
        }}
        onKeyDown={event => { if (editing && event.key === 'Escape') stopEditing() }}
      >
        <div className="agenda-heading">
          <h3 className="agenda-title agenda-editable">
            <input
              ref={titleInput}
              className="agenda-control agenda-title-input"
              value={shownTitle}
              readOnly={!editing}
              tabIndex={editing ? 0 : -1}
              aria-label="안건 제목"
              onChange={event => { setDraftTitle(event.currentTarget.value); setError('') }}
              onDoubleClick={event => { if (!editing) startEditing(event.currentTarget) }}
            />
          </h3>
          <div className="agenda-actions">
            {editing ? (
              <button key="save" type="submit" className="button button--quiet button--strong">저장</button>
            ) : (
              <button key="edit" type="button" className="button button--quiet" onClick={() => startEditing()}>수정</button>
            )}
            <button
              type="button"
              className="button button--quiet button--danger"
              onClick={() => {
                if (editing) stopEditing()
                onDeleteAgenda()
              }}
            >
              삭제
            </button>
          </div>
        </div>
        <div className="agenda-summary-field agenda-editable">
          <textarea
            className="agenda-control agenda-summary-input"
            value={shownSummary}
            readOnly={!editing}
            tabIndex={editing ? 0 : -1}
            rows={1}
            aria-label="안건 요약"
            placeholder="요약할 논의가 없습니다."
            onChange={event => setDraftSummary(event.currentTarget.value)}
            onDoubleClick={event => { if (!editing) startEditing(event.currentTarget) }}
          />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {sorted.length === 0 ? (
        <p className="doc-empty">이 안건에 남은 항목이 없습니다.</p>
      ) : (
        /* 항목은 카드가 아니라 줄입니다. 목록이니 ul로 냅니다 — 스크린리더가 개수를 읽습니다 */
        <ul className="rows">
          {sorted.map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              onEdit={() => onEdit(i.id)}
              onDelete={() => onDelete(i.id)}
            />
          ))}
        </ul>
      )}

      <button type="button" className="button button--quiet button--add" onClick={onAdd}>
        + 항목 추가
      </button>
    </section>
  )
}
