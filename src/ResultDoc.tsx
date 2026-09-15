import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../lib/labels.js'
import type { MeetingDateSource } from '../lib/postprocess.js'
import type { AttendeeDraft, EditableItem, EditableMeeting, TpoValues } from '../lib/edit.js'
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
  onSaveTpo, onSaveAttendees, onEdit, onDelete, onAdd,
}: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSaveTpo: (values: TpoValues) => void
  onSaveAttendees: (drafts: AttendeeDraft[]) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (agendaId: string) => void
}) {
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

/**
 * 편집 영역 바깥을 누르면 취소. TPO와 참석자가 같이 씁니다.
 *
 * click이 아니라 pointerdown으로 잡습니다 — 저장 버튼을 누를 때 pointerdown이
 * 먼저 오는데, 그 target은 폼 안이라 취소로 새지 않습니다.
 */
function useCancelOnOutside(editing: boolean, stop: () => void) {
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!editing) return
    const cancelOutside = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) stop()
    }
    document.addEventListener('pointerdown', cancelOutside)
    return () => document.removeEventListener('pointerdown', cancelOutside)
  }, [editing, stop])
  return formRef
}

/**
 * 읽기 모드와 수정 모드가 같은 자리에 서는 버튼.
 *
 * **key가 반드시 있어야 합니다.** 없으면 React가 두 버튼을 같은 자리의 같은
 * <button>으로 보고 DOM 노드를 재사용합니다. 그러면 「수정」을 누른 순간 그
 * 노드의 type이 button → submit으로 바뀌고, 브라우저가 아직 처리 중이던 클릭의
 * 기본 동작이 **폼 제출**이 됩니다. 곧바로 onSubmit이 돌아 편집이 바로 닫힙니다.
 */
function EditBar({ editing, onStart }: { editing: boolean; onStart: () => void }) {
  return (
    <div className="tpo-bar">
      {editing ? (
        <button key="save" type="submit" className="button button--quiet button--strong">
          저장
        </button>
      ) : (
        <button key="edit" type="button" className="button button--quiet" onClick={onStart}>
          수정
        </button>
      )}
    </div>
  )
}

/** 글리프 문자(×)는 폰트에 따라 곱셈기호로 보입니다. currentColor라 다크 모드도 따라옵니다 */
function Icon({ path }: { path: string }) {
  return (
    <svg className="icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** 화면에서만 쓰는 식별자. React가 칩을 헷갈리지 않게 붙입니다 */
interface AttendeeRow extends AttendeeDraft { uid: string }

function toRows(attendees: EditableMeeting['attendees']): AttendeeRow[] {
  return attendees.map((person, index) => ({
    uid: `o${index}`,
    nameRaw: person.nameRaw,
    contextRaw: person.contextRaw,
    originalIndex: index,
  }))
}

/**
 * 참석자. TPO와 같은 규칙입니다 — 읽기 모드와 수정 모드가 같은 DOM이고,
 * 모드가 바뀔 때 달라지는 것은 **색과 visibility뿐**입니다.
 *
 * 칩으로 만든 이유: 이 앱을 쓰는 사람은 개발자가 아닙니다. 한 줄 텍스트에
 * "이름(소속), 이름(소속)" 형식을 지켜 적게 하면 쉼표나 괄호가 어긋납니다.
 * 사람마다 칸을 나눠두면 형식을 지킬 일 자체가 없어집니다.
 *
 * 지우기(×)와 「+ 참석자」는 읽기 모드에도 자리를 잡아둡니다(visibility).
 * display로 없애면 수정을 누를 때마다 칩 폭과 줄바꿈이 달라집니다.
 */
function AttendeeSection({ meeting, onSave }: {
  meeting: EditableMeeting
  onSave: (drafts: AttendeeDraft[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<AttendeeRow[]>(() => toRows(meeting.attendees))
  const added = useRef(0)
  const formRef = useCancelOnOutside(editing, useCallback(() => setEditing(false), []))

  const shown = editing ? rows : toRows(meeting.attendees)

  function patch(uid: string, key: 'nameRaw' | 'contextRaw', value: string) {
    setRows(current => current.map(row => row.uid === uid ? { ...row, [key]: value } : row))
  }

  return (
    <Section title="참석자" note="Joiner">
      <form
        ref={formRef}
        className="people-form"
        onSubmit={event => {
          event.preventDefault()
          onSave(rows.map(row => ({
            nameRaw: row.nameRaw,
            contextRaw: row.contextRaw,
            originalIndex: row.originalIndex,
          })))
          setEditing(false)
        }}
        onKeyDown={event => { if (editing && event.key === 'Escape') setEditing(false) }}
      >
        <EditBar editing={editing} onStart={() => {
          setRows(toRows(meeting.attendees))
          setEditing(true)
        }} />

        {shown.length === 0 && (
          <p className="doc-empty">본문에서 참석자를 찾지 못했습니다.</p>
        )}

        <ul className="people">
          {shown.map(row => (
            <li className={editing ? 'person person--editing' : 'person'} key={row.uid}>
              <input
                className="person__name"
                value={row.nameRaw}
                readOnly={!editing}
                required
                size={Math.max(row.nameRaw.length, 3)}
                aria-label="참석자 이름"
                onChange={event => patch(row.uid, 'nameRaw', event.currentTarget.value)}
              />
              {/* 소속이 비어 있고 읽기 모드면 안 보입니다. 자리는 그대로 둡니다 */}
              <span className={!editing && !row.contextRaw ? 'person__context person__context--idle' : 'person__context'}>
                <span aria-hidden="true">(</span>
                <input
                  className="person__context-input"
                  value={row.contextRaw ?? ''}
                  readOnly={!editing}
                  placeholder="소속"
                  size={Math.max((row.contextRaw ?? '').length, 2)}
                  aria-label="소속"
                  onChange={event => patch(row.uid, 'contextRaw', event.currentTarget.value)}
                />
                <span aria-hidden="true">)</span>
              </span>
              <button
                type="button"
                className={editing ? 'person__remove' : 'person__remove person__remove--idle'}
                tabIndex={editing ? 0 : -1}
                aria-hidden={!editing}
                aria-label={`${row.nameRaw} 빼기`}
                title="참석자에서 빼기"
                onClick={() => setRows(current => current.filter(other => other.uid !== row.uid))}
              >
                <Icon path="M4 4l6 6M10 4l-6 6" />
              </button>
            </li>
          ))}

          <li className={editing ? 'person-add' : 'person-add person-add--idle'}>
            <button
              type="button"
              className="button button--quiet"
              tabIndex={editing ? 0 : -1}
              aria-hidden={!editing}
              onClick={() => {
                added.current += 1
                setRows(current => [...current, {
                  uid: `n${added.current}`, nameRaw: '', contextRaw: '', originalIndex: null,
                }])
              }}
            >
              + 참석자
            </button>
          </li>
        </ul>
      </form>
    </Section>
  )
}

/**
 * TPO 칸. **읽기 모드와 수정 모드가 같은 DOM입니다.**
 *
 * 예전에는 모드마다 다른 트리를 냈습니다(`dl` ↔ `form`). 그러면 「수정」을
 * 누르는 순간 칸이 통째로 갈아 끼워지면서 화면이 출렁입니다 — 값이 input이
 * 되며 높이가 바뀌고, 안내 문구와 버튼 줄이 새로 생기고, 그만큼 아래 안건이
 * 전부 밀려납니다. 고치려던 줄이 눈앞에서 움직이는 셈입니다.
 *
 * 그래서 input을 **항상** 깔아둡니다. 읽기 모드의 input은 테두리가
 * `transparent`인 1px이라 그냥 글자로 보이고, 수정 모드에서는 그 1px에 색만
 * 들어옵니다. 자리도 높이도 바뀌지 않고 **박스만 생깁니다.**
 * 안내 문구는 `visibility`로만 감춰 자리를 남겨두고, 「저장」은 「수정」이 있던
 * 자리(칸 위 오른쪽)를 그대로 씁니다 — 버튼은 두 모드 다 하나뿐입니다.
 * 취소 버튼은 두지 않습니다. TPO 바깥을 누르면 그게 취소입니다(Esc도 같습니다).
 */
function TpoSection({ meeting, dateSourceLabel, onSave }: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSave: (values: TpoValues) => void
}) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => tpoFormValues(meeting))
  const edited = new Set(meeting.editedTpoFields ?? [])
  const firstInput = useRef<HTMLInputElement>(null)
  const formRef = useCancelOnOutside(editing, useCallback(() => setEditing(false), []))

  // input이 항상 떠 있으므로 autoFocus가 다시 걸리지 않습니다. 직접 옮깁니다.
  useEffect(() => { if (editing) firstInput.current?.focus() }, [editing])

  // 읽기 모드에는 저장된 값을, 수정 모드에는 편집 중인 값을 냅니다.
  const shown = editing ? values : tpoFormValues(meeting)

  function change(key: keyof TpoValues) {
    return (next: string) => setValues(current => ({ ...current, [key]: next }))
  }

  return (
    <Section title="TPO" note="시각 · 장소 · 목적">
      <form
        ref={formRef}
        className="tpo"
        onSubmit={event => {
          event.preventDefault()
          onSave({
            meetingDate: values.meetingDate || null,
            meetingTimeRaw: values.meetingTimeRaw || null,
            meetingPlaceRaw: values.meetingPlaceRaw || null,
            purposeRaw: values.purposeRaw || null,
          })
          setEditing(false)
        }}
        onKeyDown={event => { if (editing && event.key === 'Escape') setEditing(false) }}
      >
        <EditBar editing={editing} onStart={() => {
          setValues(tpoFormValues(meeting))
          setEditing(true)
        }} />

        <TpoRow label="날짜" type="date" editing={editing} inputRef={firstInput}
          value={shown.meetingDate} onChange={change('meetingDate')}
          raw={dateSourceLabel[meeting.meetingDateSource]} edited={edited.has('meetingDate')} />
        <TpoRow label="시각" editing={editing}
          value={shown.meetingTimeRaw} onChange={change('meetingTimeRaw')}
          edited={edited.has('meetingTimeRaw')} />
        <TpoRow label="장소" editing={editing}
          value={shown.meetingPlaceRaw} onChange={change('meetingPlaceRaw')}
          edited={edited.has('meetingPlaceRaw')} />
        <TpoRow label="목적" editing={editing}
          value={shown.purposeRaw} onChange={change('purposeRaw')}
          edited={edited.has('purposeRaw')} />
        {/* 읽기 모드에서도 자리는 차지합니다 — 생겼다 사라지면 아래가 밀립니다 */}
        <p className={editing ? 'tpo-note' : 'tpo-note tpo-note--idle'} aria-hidden={!editing}>
          날짜를 바꾸면 자동 계산된 기한도 다시 계산됩니다. 직접 고친 기한은 그대로 둡니다.
        </p>
      </form>
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

/**
 * TPO 한 줄. 모드가 바뀌어도 같은 요소가 그대로 남습니다.
 *
 * 값이 비면 칸을 지우지 않고 placeholder로 "원문에 없음"을 남깁니다 —
 * 회의록에 장소가 안 적혀 있다는 것과, 장소 칸이 화면에 없는 것은 다릅니다.
 * 날짜만 수정 중일 때 `type="date"`로 바뀌는데, 폭을 CSS에서 못 박아 뒀으므로
 * 달력 아이콘이 상자 **안에서** 생겼다 사라질 뿐 줄이 움직이지 않습니다.
 */
function TpoRow({ label, value, onChange, editing, type = 'text', raw, edited = false, inputRef }: {
  label: string
  value: string
  onChange: (value: string) => void
  editing: boolean
  type?: 'text' | 'date'
  raw?: string
  edited?: boolean
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <label className={editing ? 'field tpo-row tpo-row--editing' : 'field tpo-row'}>
      <span className="field-key">{label}</span>
      <span className="field-value tpo-row__value">
        <input
          ref={inputRef}
          className={type === 'date' ? 'tpo-row__control tpo-row__control--date' : 'tpo-row__control'}
          type={editing && type === 'date' ? 'date' : 'text'}
          value={value}
          readOnly={!editing}
          placeholder="원문에 없음"
          onChange={event => onChange(event.currentTarget.value)}
        />
        {raw && <span className="field-raw">{raw}</span>}
        {edited && <span className="field-edited">직접 수정됨</span>}
      </span>
    </label>
  )
}

function Section({
  title,
  note,
  count,
  children,
}: {
  title: string
  note: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="doc-section">
      <h2 className="doc-title">
        {title}
        {count !== undefined && <span className="doc-count">{count}</span>}
        <span className="doc-note">{note}</span>
      </h2>
      {children}
    </section>
  )
}
