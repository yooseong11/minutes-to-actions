import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttendeeDraft, EditableMeeting } from '../../lib/edit.js'
import EditBar from '../ui/EditBar.js'
import Icon from '../ui/Icon.js'
import Section from '../ui/Section.js'
import useCancelOnOutside from '../ui/useCancelOnOutside.js'

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
export default function AttendeeSection({ meeting, onSave }: {
  meeting: EditableMeeting
  onSave: (drafts: AttendeeDraft[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<AttendeeRow[]>(() => toRows(meeting.attendees))
  const added = useRef(0)
  const firstInput = useRef<HTMLInputElement>(null)
  /** 더블클릭으로 들어왔을 때 커서를 받을 칸. 버튼으로 들어오면 첫 사람입니다 */
  const focusTarget = useRef<HTMLInputElement | null>(null)
  const formRef = useCancelOnOutside(editing, useCallback(() => setEditing(false), []))

  const shown = editing ? rows : toRows(meeting.attendees)

  useEffect(() => {
    if (editing) (focusTarget.current ?? firstInput.current)?.focus()
  }, [editing])

  /** 더블클릭한 칸으로 커서를 보냅니다. 칩이 여럿이라 첫 칸 고정은 더 불편합니다 */
  function startEditing(target?: HTMLInputElement) {
    focusTarget.current = target ?? null
    setRows(toRows(meeting.attendees))
    setEditing(true)
  }

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
        <EditBar editing={editing} onStart={() => startEditing()} />

        {shown.length === 0 && (
          <p className="doc-empty">본문에서 참석자를 찾지 못했습니다.</p>
        )}

        <ul className="people">
          {shown.map((row, index) => (
            <li className={editing ? 'person person--editing' : 'person'} key={row.uid}>
              <input
                ref={index === 0 ? firstInput : undefined}
                className="person__name"
                value={row.nameRaw}
                readOnly={!editing}
                tabIndex={editing ? 0 : -1}
                required
                size={Math.max(row.nameRaw.length, 3)}
                aria-label="참석자 이름"
                onChange={event => patch(row.uid, 'nameRaw', event.currentTarget.value)}
                onDoubleClick={event => { if (!editing) startEditing(event.currentTarget) }}
              />
              {/* 소속이 비어 있고 읽기 모드면 안 보입니다. 자리는 그대로 둡니다 */}
              <span className={!editing && !row.contextRaw ? 'person__context person__context--idle' : 'person__context'}>
                <span aria-hidden="true">(</span>
                <input
                  className="person__context-input"
                  value={row.contextRaw ?? ''}
                  readOnly={!editing}
                  tabIndex={editing ? 0 : -1}
                  placeholder="소속"
                  size={Math.max((row.contextRaw ?? '').length, 2)}
                  aria-label="소속"
                  onChange={event => patch(row.uid, 'contextRaw', event.currentTarget.value)}
                  onDoubleClick={event => { if (!editing) startEditing(event.currentTarget) }}
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
