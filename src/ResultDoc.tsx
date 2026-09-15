import { useState } from 'react'
import { SECTIONS } from '../lib/labels.js'
import type { MeetingDateSource } from '../lib/postprocess.js'
import type { EditableItem, EditableMeeting, TpoValues } from '../lib/edit.js'
import ItemCard from './ItemCard.js'

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
  onSaveTpo, onEdit, onDelete, onAdd,
}: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSaveTpo: (values: TpoValues) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (agendaId: string) => void
}) {
  return (
    <div className="doc">
      <Section title="참석자" note="Joiner">
        {meeting.attendees.length === 0 ? (
          <p className="doc-empty">본문에서 참석자를 찾지 못했습니다.</p>
        ) : (
          <p className="doc-line">
            {meeting.attendees
              .map((a) => (a.contextRaw ? `${a.nameRaw}(${a.contextRaw})` : a.nameRaw))
              .join(', ')}
          </p>
        )}
      </Section>

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
                onEdit={onEdit}
                onDelete={onDelete}
                onAdd={() => onAdd(agenda.id)}
              />
            ))}
          </div>
        )}
      </Section>
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
  title, summary, items, onEdit, onDelete, onAdd,
}: {
  title: string
  summary: string | null
  items: EditableItem[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
}) {
  return (
    <section className="agenda">
      <h3 className="agenda-title">
        {title}
        <span className="agenda-count">항목 {items.length}</span>
      </h3>

      {summary === null ? (
        <p className="agenda-summary agenda-summary--empty">요약할 논의가 없습니다.</p>
      ) : (
        <p className="agenda-summary">{summary}</p>
      )}

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

function TpoSection({ meeting, dateSourceLabel, onSave }: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSave: (values: TpoValues) => void
}) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => tpoFormValues(meeting))
  const edited = new Set(meeting.editedTpoFields ?? [])

  function startEditing() {
    setValues(tpoFormValues(meeting))
    setEditing(true)
  }

  return (
    <Section title="TPO" note="시각 · 장소 · 목적" action={!editing && (
      <button type="button" className="button button--quiet doc-edit" onClick={startEditing}>
        수정
      </button>
    )}>
      {editing ? (
        <form className="tpo tpo-form" onSubmit={event => {
          event.preventDefault()
          onSave({
            meetingDate: values.meetingDate || null,
            meetingTimeRaw: values.meetingTimeRaw || null,
            meetingPlaceRaw: values.meetingPlaceRaw || null,
            purposeRaw: values.purposeRaw || null,
          })
          setEditing(false)
        }}>
          <TpoInput label="날짜" type="date" value={values.meetingDate} autoFocus
            onChange={meetingDate => setValues(current => ({ ...current, meetingDate }))} />
          <TpoInput label="시각" value={values.meetingTimeRaw}
            onChange={meetingTimeRaw => setValues(current => ({ ...current, meetingTimeRaw }))} />
          <TpoInput label="장소" value={values.meetingPlaceRaw}
            onChange={meetingPlaceRaw => setValues(current => ({ ...current, meetingPlaceRaw }))} />
          <TpoInput label="목적" value={values.purposeRaw}
            onChange={purposeRaw => setValues(current => ({ ...current, purposeRaw }))} />
          <p className="tpo-form__note">
            날짜를 바꾸면 자동 계산된 기한도 함께 다시 계산됩니다. 직접 수정한 기한은 유지됩니다.
          </p>
          <div className="tpo-form__actions">
            <button type="button" className="button button--quiet" onClick={() => setEditing(false)}>취소</button>
            <button type="submit" className="button">저장</button>
          </div>
        </form>
      ) : (
        <dl className="tpo">
          <div className="field">
            <dt className="field-key">날짜</dt>
            <dd className="field-value">
              {meeting.meetingDate ?? <span className="field-empty">—</span>}
              <span className="field-raw">{dateSourceLabel[meeting.meetingDateSource]}</span>
              {edited.has('meetingDate') && <span className="field-edited">직접 수정됨</span>}
            </dd>
          </div>
          <Field label="시각" value={meeting.meetingTimeRaw} edited={edited.has('meetingTimeRaw')} />
          <Field label="장소" value={meeting.meetingPlaceRaw} edited={edited.has('meetingPlaceRaw')} />
          <Field label="목적" value={meeting.purposeRaw} edited={edited.has('purposeRaw')} />
        </dl>
      )}
    </Section>
  )
}

type TpoFormState = Record<keyof TpoValues, string>

function tpoFormValues(meeting: EditableMeeting): TpoFormState {
  return {
    meetingDate: meeting.meetingDate ?? '',
    meetingTimeRaw: meeting.meetingTimeRaw ?? '',
    meetingPlaceRaw: meeting.meetingPlaceRaw ?? '',
    purposeRaw: meeting.purposeRaw ?? '',
  }
}

function TpoInput({ label, value, onChange, type = 'text', autoFocus = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date'
  autoFocus?: boolean
}) {
  return (
    <label className="tpo-input">
      <span className="field-key">{label}</span>
      <input className="edit-input tpo-input__control" type={type} value={value}
        onChange={event => onChange(event.currentTarget.value)} autoFocus={autoFocus} />
    </label>
  )
}

function Section({
  title,
  note,
  count,
  action,
  children,
}: {
  title: string
  note: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="doc-section">
      <h2 className="doc-title">
        {title}
        {count !== undefined && <span className="doc-count">{count}</span>}
        <span className="doc-note">{note}</span>
        {action}
      </h2>
      {children}
    </section>
  )
}

/**
 * 원문에서 그대로 옮긴 한 칸. 사용자가 고친 뒤에는 수정 표시를 함께 냅니다.
 *
 * 값이 없을 때 칸을 지우지 않고 "원문에 없음"을 남깁니다.
 * 회의록에 장소가 안 적혀 있다는 것은, 장소 칸이 화면에 없는 것과 다릅니다.
 */
function Field({ label, value, edited = false }: { label: string; value: string | null; edited?: boolean }) {
  return (
    <div className="field">
      <dt className="field-key">{label}</dt>
      <dd className="field-value">
        {value ?? <span className="field-empty">원문에 없음</span>}
        {edited && <span className="field-edited">직접 수정됨</span>}
      </dd>
    </div>
  )
}
