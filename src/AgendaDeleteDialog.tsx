import { useEffect, useId, useRef } from 'react'

export default function AgendaDeleteDialog({ title, itemCount, onConfirm, onClose }: {
  title: string
  itemCount: number
  onConfirm: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="item-modal delete-modal"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
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
          <h2 id={titleId} className="item-modal__title">안건을 삭제할까요?</h2>
        </header>
        <div className="item-modal__body delete-modal__body">
          <p id={descriptionId} className="delete-modal__description">
            <strong>“{title}”</strong> 안건과 포함된 항목 {itemCount}개가 함께 삭제됩니다.
          </p>
          <p className="hint">삭제한 뒤에도 마지막 변경 되돌리기로 복구할 수 있습니다.</p>
          <div className="delete-modal__actions">
            <button type="button" className="button button--quiet" autoFocus onClick={onClose}>취소</button>
            <button type="button" className="button button--danger" onClick={onConfirm}>안건 삭제</button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
