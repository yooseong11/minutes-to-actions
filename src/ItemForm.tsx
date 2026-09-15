import { useId, useState } from 'react'
import { ITEM_TYPE } from '../lib/labels.js'
import type { ItemType, RawAttendee } from '../lib/types.js'

export interface ItemValues { content: string; type: ItemType; assignee: RawAttendee | null; due: string | null; clearedFields?: 'due'[] }
export default function ItemForm({ initial, attendees, onSave, adding = false }: {
  initial: ItemValues; attendees: RawAttendee[]; onSave: (values: ItemValues) => void; adding?: boolean
}) {
  const id = useId()
  const [content, setContent] = useState(initial.content)
  const [type, setType] = useState(initial.type)
  const [assignee, setAssignee] = useState<RawAttendee | null>(() =>
    attendees.find(person => sameAttendee(person, initial.assignee)) ?? null,
  )
  const [due, setDue] = useState(initial.due ?? '')
  const [error, setError] = useState('')
  const [clearedFields, setClearedFields] = useState<'due'[]>([])
  return (
    <form className="item-form" onSubmit={event => {
      event.preventDefault()
      if (!content.trim()) { setError('항목 내용을 입력해 주세요.'); return }
      onSave({ content: content.trim(), type, due: due || null, clearedFields, assignee })
    }}>
      <label htmlFor={`${id}-type`}>분류</label>
      <select id={`${id}-type`} className="edit-input" value={type} onChange={event => setType(event.target.value as ItemType)}>
        {Object.entries(ITEM_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <fieldset className="edit-assignee">
        <legend>담당자 <span className="hint">선택하지 않으면 담당자 없음 · 다시 누르면 선택 해제</span></legend>
        {attendees.length === 0 ? (
          <p className="hint">회의록에서 참석자를 찾지 못했습니다.</p>
        ) : (
          <div className="chips">
            {attendees.map((person, index) => {
              const selected = sameAttendee(person, assignee)
              return (
                <button type="button" className="chip" key={`${person.nameRaw}|${person.contextRaw}|${index}`}
                  aria-pressed={selected}
                  title={selected ? '담당자 선택 해제' : '담당자로 선택'}
                  onClick={() => setAssignee(selected ? null : person)}>
                  {person.nameRaw}{person.contextRaw ? ` (${person.contextRaw})` : ''}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>
      <label htmlFor={`${id}-due`}>기한 <span className="hint">비워둬도 됩니다</span></label>
      <div className="edit-row">
        <input id={`${id}-due`} className="edit-input" type="date" value={due} onInput={event => setDue(event.currentTarget.value)} />
        <button type="button" className="button button--quiet button--danger button--clear" onClick={() => { setDue(''); setClearedFields(fields => [...fields, 'due']) }}>기한 지우기</button>
      </div>
      <label htmlFor={`${id}-content`}>항목 내용</label>
      <textarea id={`${id}-content`} className="edit-input edit-content" value={content} required autoFocus
        onChange={event => { setContent(event.target.value); setError('') }} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button button--form-submit">
          {adding ? '추가' : '수정'}
        </button>
      </div>
    </form>
  )
}

function sameAttendee(left: RawAttendee, right: RawAttendee | null): boolean {
  return left.nameRaw === right?.nameRaw && (left.contextRaw ?? null) === (right.contextRaw ?? null)
}
