import { useEffect, useId, useRef } from 'react'
import type { RawAttendee } from '../lib/types.js'
import ItemForm, { type ItemValues } from './ItemForm.js'

export default function ItemModal({ mode, agendaTitle, initial, attendees, onSave, onClose }: {
  mode: 'add' | 'edit'
  agendaTitle: string
  initial: ItemValues
  attendees: RawAttendee[]
  onSave: (values: ItemValues) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="item-modal"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault()
        onClose()
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="item-modal__panel">
        <header className="item-modal__header">
          <div>
            <h2 id={titleId} className="item-modal__title">
              {mode === 'add' ? '항목 추가' : '항목 수정'}
            </h2>
            <p className="item-modal__context">{agendaTitle}</p>
          </div>
          <button type="button" className="icon-button item-modal__close" aria-label="닫기" onClick={onClose}>
            <svg className="icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
              <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.3"
                strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="item-modal__body">
          <ItemForm
            initial={initial}
            attendees={attendees}
            adding={mode === 'add'}
            onSave={onSave}
          />
        </div>
      </div>
    </dialog>
  )
}
