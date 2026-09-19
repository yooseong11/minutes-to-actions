import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../lib/labels.js'
import type { MeetingDateSource } from '../lib/postprocess.js'
import type { AgendaValues, AttendeeDraft, EditableItem, EditableMeeting, TpoValues } from '../lib/edit.js'
import AgendaDeleteDialog from './AgendaDeleteDialog.js'
import ItemCard from './ItemCard.js'
import AttendeeSection from './meeting/AttendeeSection.js'
import TpoSection from './meeting/TpoSection.js'
import Section from './ui/Section.js'
import useCancelOnOutside from './ui/useCancelOnOutside.js'

/**
 * 결과를 **회의록 문서 모양**으로 냅니다. 항목 목록이 아니라 문서입니다.
 *
 * 회의록 5대 필수 요소:
 *   Joiner  참석자
 *   TPO     시각·장소·목적
 *   Done    결정사항
 *   WILL DO 누가 언제까지 무엇을
 *   TBD     논의가 끝나지 않은 아젠다
 *
 * **항목은 카드가 아니라 한 줄입니다.** 카드는 항목이 평면 목록이던 시절의 흔적이고,
 * 안건이 경계를 그어주는 지금은 상자가 한 겹 남습니다. `ItemCard.tsx` 주석 참조.
 *
 * **4.5에서 바뀐 것 — Done·WillDo·TBD를 세 칸으로 가르지 않고 안건 밑으로 넣었습니다.**
 * 세 칸으로 가르면 "한 달치 질문 분류"가 무슨 질문인지 알 수 없게 됩니다. 답이
 * 세 발화 앞에 있는데 그 발화는 다른 칸에 있기 때문입니다. 분류는 없어지지 않고
 * 각 항목의 라벨로 남습니다 — 안건 안에서 결정 → 할 일 → 미결 순으로 읽습니다.
 *
 * **빈 칸도 제목을 남깁니다.** 없는 칸을 지우면 회의록에 뭐가 빠졌는지 안 보입니다.
 * 이 순서와 제목이 그대로 섹션 5의 마크다운 내보내기가 됩니다.
 *
 * 검증 여부가 다른 칸은 생김새도 달라야 합니다. **안건 제목과 안건 요약 두 칸만
 * AI가 쓴 문장이고**, 그 둘에만 "확인이 필요합니다"를 붙입니다. 나머지는 원문
 * 발췌라 코드가 원문과 대조합니다.
 *
 * TPO의 시각·장소·목적은 처음에는 **원문에 있는 값을 그대로 옮긴 것**입니다.
 * 사용자가 고치면 최초 추출값은 `originalTpo`에 보존하고 화면에는 수정 표시를 남깁니다.
 * 원문에 없으면 "원문에 없음"이라고 적습니다 — 비었다는 사실 자체가 정보입니다.
 */

/** 안건 안에서 항목을 읽는 순서. 결정 → 할 일 → 미결 (SECTIONS가 단일 출처) */
const TYPE_ORDER = SECTIONS.map((s) => s.type)

export default function ResultDoc({
  meeting,
  dateSourceLabel,
  onSaveTpo, onSaveAttendees, onSaveAgenda, onDeleteAgenda, onEdit, onDelete, onAdd,
}: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSaveTpo: (values: TpoValues) => void
  onSaveAttendees: (drafts: AttendeeDraft[]) => void
  onSaveAgenda: (id: string, values: AgendaValues) => void
  onDeleteAgenda: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (agendaId: string) => void
}) {
  const [deletingAgendaId, setDeletingAgendaId] = useState<string | null>(null)
  const deletingAgenda = meeting.agendas.find(agenda => agenda.id === deletingAgendaId)

  return (
    <div className="doc">
      <AttendeeSection meeting={meeting} onSave={onSaveAttendees} />

      <TpoSection meeting={meeting} dateSourceLabel={dateSourceLabel} onSave={onSaveTpo} />

      <Section title="안건" note="Done · Will Do · TBD" count={meeting.agendas.length}>
        {/* 경고가 안건보다 위에 옵니다. 읽고 난 뒤에 알려주면 늦습니다 */}
        <p className="doc-unverified">
          <strong>확인이 필요합니다.</strong> 안건 제목과 안건 요약은 원문 발췌가
          아니라 AI가 쓴 문장입니다. 어느 항목을 한 안건으로 묶을지도 AI가
          정했습니다. 각 항목의 내용·담당자·기한은 원문과 대조했지만,
          <strong> 묶음과 제목·요약은 대조할 원문이 없습니다.</strong>
        </p>

        {meeting.agendas.length === 0 ? (
          <p className="doc-empty">본문에서 안건을 찾지 못했습니다.</p>
        ) : (
          <div className="agendas">
            {meeting.agendas.map((agenda) => (
              <Agenda
                key={agenda.id}
                title={agenda.title}
                summary={agenda.summary}
                items={sortByType(meeting.items.filter((i) => i.agendaId === agenda.id))}
                onSave={values => onSaveAgenda(agenda.id, values)}
                onDeleteAgenda={() => setDeletingAgendaId(agenda.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                onAdd={() => onAdd(agenda.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {deletingAgenda && (
        <AgendaDeleteDialog
          title={deletingAgenda.title}
          itemCount={meeting.items.filter(item => item.agendaId === deletingAgenda.id).length}
          onClose={() => setDeletingAgendaId(null)}
          onConfirm={() => {
            setDeletingAgendaId(null)
            onDeleteAgenda(deletingAgenda.id)
          }}
        />
      )}
    </div>
  )
}

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
function Agenda({
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

      {items.length === 0 ? (
        <p className="doc-empty">이 안건에 남은 항목이 없습니다.</p>
      ) : (
        /* 항목은 카드가 아니라 줄입니다. 목록이니 ul로 냅니다 — 스크린리더가 개수를 읽습니다 */
        <ul className="rows">
          {items.map((i) => (
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
