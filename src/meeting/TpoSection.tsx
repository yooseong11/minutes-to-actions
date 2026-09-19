import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { MeetingDateSource } from '../../lib/postprocess.js'
import type { EditableMeeting, TpoValues } from '../../lib/edit.js'
import EditBar from '../ui/EditBar.js'
import Section from '../ui/Section.js'
import useCancelOnOutside from '../ui/useCancelOnOutside.js'

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
export default function TpoSection({ meeting, dateSourceLabel, onSave }: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onSave: (values: TpoValues) => void
}) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState(() => tpoFormValues(meeting))
  const edited = new Set(meeting.editedTpoFields ?? [])
  const firstInput = useRef<HTMLInputElement>(null)
  /** 더블클릭으로 들어왔을 때 커서를 받을 칸. 버튼으로 들어오면 비어 있습니다 */
  const focusTarget = useRef<HTMLInputElement | null>(null)
  const formRef = useCancelOnOutside(editing, useCallback(() => setEditing(false), []))

  // input이 항상 떠 있으므로 autoFocus가 다시 걸리지 않습니다. 직접 옮깁니다.
  useEffect(() => {
    if (editing) (focusTarget.current ?? firstInput.current)?.focus()
  }, [editing])

  /*
   * 더블클릭한 칸으로 커서를 보냅니다. 무조건 첫 칸(날짜)으로 보내면
   * 「장소」를 두 번 눌렀는데 커서가 날짜에 가 있는 일이 생깁니다.
   * input은 읽기 모드에도 같은 노드로 떠 있으므로, 여기서 잡아둔 노드가
   * 수정 모드에서도 그대로 유효합니다.
   */
  function startEditing(target?: HTMLInputElement) {
    focusTarget.current = target ?? null
    setValues(tpoFormValues(meeting))
    setEditing(true)
  }

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
        <EditBar editing={editing} onStart={() => startEditing()} />

        <TpoRow label="날짜" type="date" editing={editing} inputRef={firstInput} onStartEdit={startEditing}
          value={shown.meetingDate} onChange={change('meetingDate')}
          raw={dateSourceLabel[meeting.meetingDateSource]} edited={edited.has('meetingDate')} />
        <TpoRow label="시각" editing={editing} onStartEdit={startEditing}
          value={shown.meetingTimeRaw} onChange={change('meetingTimeRaw')}
          edited={edited.has('meetingTimeRaw')} />
        <TpoRow label="장소" editing={editing} onStartEdit={startEditing}
          value={shown.meetingPlaceRaw} onChange={change('meetingPlaceRaw')}
          edited={edited.has('meetingPlaceRaw')} />
        <TpoRow label="목적" editing={editing} onStartEdit={startEditing}
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
 *
 * 읽기 모드에서는 `tabIndex={-1}`로 탭 순서에서 뺍니다. 포커스 테두리를 지웠기
 * 때문에, 탭이 여기 멈추면 사용자는 자기가 어디에 있는지 알 수 없게 됩니다.
 */
function TpoRow({ label, value, onChange, editing, type = 'text', raw, edited = false, inputRef, onStartEdit }: {
  label: string
  value: string
  onChange: (value: string) => void
  editing: boolean
  type?: 'text' | 'date'
  raw?: string
  edited?: boolean
  inputRef?: Ref<HTMLInputElement>
  onStartEdit: (target: HTMLInputElement) => void
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
          tabIndex={editing ? 0 : -1}
          placeholder="원문에 없음"
          onChange={event => onChange(event.currentTarget.value)}
          onDoubleClick={event => { if (!editing) onStartEdit(event.currentTarget) }}
        />
        {raw && <span className="field-raw">{raw}</span>}
        {edited && <span className="field-edited">직접 수정됨</span>}
      </span>
    </label>
  )
}
