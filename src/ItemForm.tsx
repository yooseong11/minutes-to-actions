import { useId, useState } from 'react'
import { ITEM_TYPE } from '../lib/labels.js'
import type { ItemType, RawAttendee } from '../lib/types.js'

export interface ItemValues { content: string; type: ItemType; assignee: RawAttendee | null; due: string | null; clearedFields?: ('assignee' | 'due')[] }
export default function ItemForm({ initial, attendees, onSave, onCancel, adding = false }: {
  initial: ItemValues; attendees: RawAttendee[]; onSave: (values: ItemValues) => void; onCancel: () => void; adding?: boolean
}) {
  const id = useId()
  const [content, setContent] = useState(initial.content)
  const [type, setType] = useState(initial.type)
  const [name, setName] = useState(initial.assignee?.nameRaw ?? '')
  const [context, setContext] = useState(initial.assignee?.contextRaw ?? '')
  const [due, setDue] = useState(initial.due ?? '')
  const [error, setError] = useState('')
  const [clearedFields, setClearedFields] = useState<('assignee' | 'due')[]>([])
  return (
    <form className="item-form" onSubmit={event => {
      event.preventDefault()
      if (!content.trim()) { setError('항목 내용을 입력해 주세요.'); return }
      onSave({ content: content.trim(), type, due: due || null, clearedFields,
        assignee: name.trim() ? { nameRaw: name.trim(), contextRaw: context.trim() || null } : null })
    }}>
      <label htmlFor={`${id}-content`}>항목 내용</label>
      <textarea id={`${id}-content`} className="edit-input edit-content" value={content} required autoFocus
        onChange={event => { setContent(event.target.value); setError('') }} />
      <label htmlFor={`${id}-type`}>분류</label>
      <select id={`${id}-type`} className="edit-input" value={type} onChange={event => setType(event.target.value as ItemType)}>
        {Object.entries(ITEM_TYPE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <fieldset className="edit-assignee">
        <legend>담당자 <span className="hint">선택 또는 직접 입력 · 비워둬도 됩니다</span></legend>
        <div className="chips">
          {attendees.map((person, index) => <button type="button" className="chip" key={`${person.nameRaw}|${person.contextRaw}|${index}`}
            aria-pressed={name === person.nameRaw && context === (person.contextRaw ?? '')}
            onClick={() => { setName(person.nameRaw); setContext(person.contextRaw ?? '') }}>
            {person.nameRaw}{person.contextRaw ? ` (${person.contextRaw})` : ''}
          </button>)}
        </div>
        <div className="edit-row">
          <label className="edit-field" htmlFor={`${id}-name`}>이름
            <input id={`${id}-name`} className="edit-input" value={name} onChange={event => setName(event.target.value)} />
          </label>
          <label className="edit-field" htmlFor={`${id}-context`}>소속 / 구분
            <input id={`${id}-context`} className="edit-input" value={context} onChange={event => setContext(event.target.value)} />
          </label>
          <button type="button" className="button button--quiet button--danger button--clear" onClick={() => { setName(''); setContext(''); setClearedFields(fields => [...fields, 'assignee']) }}>담당자 지우기</button>
        </div>
      </fieldset>
      <label htmlFor={`${id}-due`}>기한 <span className="hint">비워둬도 됩니다</span></label>
      <div className="edit-row">
        <input id={`${id}-due`} className="edit-input" type="date" value={due} onInput={event => setDue(event.currentTarget.value)} />
        <button type="button" className="button button--quiet button--danger button--clear" onClick={() => { setDue(''); setClearedFields(fields => [...fields, 'due']) }}>기한 지우기</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" className="button">{adding ? '항목 추가' : '수정 적용'}</button>
        <button type="button" className="button button--quiet button--edit" onClick={onCancel}>취소</button>
      </div>
    </form>
  )
}
