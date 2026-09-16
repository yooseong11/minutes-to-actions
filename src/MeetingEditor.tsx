import { useState } from 'react'
import {
  createItem,
  deleteAgenda,
  editAgenda,
  editItem,
  editMeetingAttendees,
  editMeetingTpo,
  type EditableMeeting,
  type ItemPatch,
} from '../lib/edit.js'
import type { MeetingDateSource, ProcessedMeeting } from '../lib/postprocess.js'
import ItemModal from './ItemModal.js'
import type { ItemValues } from './ItemForm.js'
import ResultDoc from './ResultDoc.js'
import { toMarkdown } from '../lib/export-markdown.js'
import { csvFileName, toCsv } from '../lib/export-csv.js'

const DATE_SOURCE_LABEL: Record<MeetingDateSource, string> = {
  user: '고르신 날짜를 기준으로 계산했어요',
  document: '회의록 원문에 적힌 날짜를 기준으로 계산했어요',
  fallback: '원문에 회의 날짜가 없어서 오늘을 기준으로 계산했어요',
  none: '기준 날짜가 없어서 기한을 환산하지 못했어요',
}

export default function MeetingEditor({ meeting }: { meeting: ProcessedMeeting }) {
  const [draft, setDraft] = useState<EditableMeeting>(meeting)
  const [history, setHistory] = useState<EditableMeeting[]>([])
  // 추가와 수정은 같은 데이터를 다루므로 하나의 모달 상태로 관리합니다.
  const [editor, setEditor] = useState<
    { mode: 'add'; agendaId: string } | { mode: 'edit'; itemId: string } | null
  >(null)
  const [notice, setNotice] = useState('')
  const [restoreVersion, setRestoreVersion] = useState(0)
  function commit(next: EditableMeeting, message: string) {
    setHistory(previous => [...previous, draft])
    setDraft(next)
    setNotice(message)
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setDraft(previous)
    setHistory(history.slice(0, -1))
    setRestoreVersion(version => version + 1)
    setEditor(null)
    setNotice('마지막 변경을 되돌렸어요.')
  }
  /**
   * 마크다운 복사 (섹션 5).
   *
   * 편집이 아니므로 history에 쌓지 않습니다 — 되돌릴 게 없습니다.
   * `toMarkdown`은 `draft`를 받습니다. 화면에 보이는 값 그대로가 나가야 합니다.
   */
  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(toMarkdown(draft))
      setNotice('마크다운을 복사했어요. 노션에 붙여넣으면 됩니다.')
    } catch {
      // 클립보드는 보안 컨텍스트(https·localhost)에서만 동작합니다. 조용히 실패하지 않습니다.
      setNotice('복사하지 못했어요. 브라우저가 클립보드 접근을 막았을 수 있습니다.')
    }
  }
  /**
   * CSV 내려받기 (섹션 5).
   *
   * 마크다운은 복사지만 CSV는 파일입니다 — 엑셀이 열 대상이 클립보드가 아니라 파일입니다.
   * objectURL은 쓰고 나서 반드시 풀어줍니다. 안 풀면 탭이 살아 있는 동안 메모리에 남습니다.
   */
  function downloadCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(draft)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = csvFileName(draft)
    link.click()
    URL.revokeObjectURL(url)
    setNotice('CSV를 내려받았어요. 엑셀에서 「분류」로 거르면 할 일만 볼 수 있습니다.')
  }
  return (
          <section className="result">
            <p className="hint">수정은 이 화면에 적용됩니다. 새로고침하거나 다시 추출하면 초기화됩니다.</p>
            <div className="actions">
              <button type="button" className="button button--quiet" disabled={!history.length} onClick={undo}>마지막 변경 되돌리기</button>
              <span role="status" className="hint">{notice}</span>
            </div>
            <ResultDoc key={restoreVersion} meeting={draft} dateSourceLabel={DATE_SOURCE_LABEL}
              onSaveTpo={values => {
                const next = editMeetingTpo(draft, values)
                if (next === draft) {
                  setNotice('변경된 내용이 없어요.')
                  return
                }
                const dateChanged = next.meetingDate !== draft.meetingDate
                commit(next, dateChanged
                  ? 'TPO를 수정하고 자동 계산된 기한을 다시 계산했어요.'
                  : 'TPO를 수정했어요.')
              }}
              onSaveAttendees={drafts => {
                const next = editMeetingAttendees(draft, drafts)
                if (next === draft) {
                  setNotice('변경된 내용이 없어요.')
                  return
                }
                // 담당자가 딸려 바뀌는 게 조용히 일어나면 안 됩니다. 문장으로 알립니다.
                const assigneeChanged = next.items.some((item, index) => item !== draft.items[index])
                commit(next, assigneeChanged
                  ? '참석자를 수정하고, 그 사람이 담당이던 항목도 함께 맞췄어요.'
                  : '참석자를 수정했어요.')
              }}
              onSaveAgenda={(agendaId, values) => {
                const next = editAgenda(draft, agendaId, values)
                if (next === draft) {
                  setNotice('변경된 내용이 없어요.')
                  return
                }
                commit(next, '안건을 수정했어요.')
              }}
              onDeleteAgenda={agendaId => {
                const itemCount = draft.items.filter(item => item.agendaId === agendaId).length
                commit(deleteAgenda(draft, agendaId),
                  `안건과 포함된 항목 ${itemCount}개를 삭제했어요. 되돌릴 수 있습니다.`)
              }}
              onAdd={agendaId => setEditor({ mode: 'add', agendaId })}
              onEdit={itemId => setEditor({ mode: 'edit', itemId })}
              onDelete={id => commit({ ...draft, items: draft.items.filter(item => item.id !== id) }, '')} />

            {editor && (() => {
              const item = editor.mode === 'edit' ? draft.items.find(i => i.id === editor.itemId) : undefined
              const agendaId = editor.mode === 'add' ? editor.agendaId : item?.agendaId
              const agendaTitle = draft.agendas.find(agenda => agenda.id === agendaId)?.title ?? '안건 없음'
              if (editor.mode === 'edit' && !item) return null
              const initial: ItemValues = item ?? { type: 'action', content: '', assignee: null, due: null }

              return (
                <ItemModal
                  key={editor.mode === 'add' ? `add:${editor.agendaId}` : `edit:${editor.itemId}`}
                  mode={editor.mode}
                  agendaTitle={agendaTitle}
                  initial={initial}
                  attendees={draft.attendees}
                  onClose={() => setEditor(null)}
                  onSave={values => {
                    if (editor.mode === 'add') {
                      commit({
                        ...draft,
                        items: [...draft.items, createItem(crypto.randomUUID(), editor.agendaId, values.type, values.content, values.assignee, values.due)],
                      }, '항목을 추가했어요.')
                    } else if (item) {
                      const patch = toItemPatch(item, values)
                      if (Object.keys(patch).length) {
                        commit({
                          ...draft,
                          items: draft.items.map(current => current.id === item.id ? editItem(current, patch) : current),
                        }, '수정을 적용했어요.')
                      }
                    }
                    setEditor(null)
                  }}
                />
              )
            })()}

            <details className="excluded">
              <summary className="excluded-summary">
                원문 대조 실패로 제외됨 {draft.rejected.length}건
              </summary>
              <p className="excluded-note">
                인용문이 원문에 없어 항목에서 뺀 것들입니다. 대부분은 지어낸 내용이지만,
                줄바꿈 차이 때문에 멀쩡한 항목이 걸리기도 합니다. 조용히 버리면
                액션아이템 하나가 사라진 걸 모르게 되므로 내용까지 남겨둡니다.
              </p>
              {draft.rejected.map((r, i) => (
                <div className="rejected-item" key={`${r.item.quote}|${i}`}>
                  <p className="rejected-content">{r.item.content || '(내용 없음)'}</p>
                  <p className="rejected-quote">
                    원문에 없던 {r.hallucinated.join(' / ')}: “{r.item.quote}”
                  </p>
                </div>
              ))}
            </details>

            {/*
              내보내기는 문서를 끝까지 읽고 난 자리에 둡니다. 여기 한 군데뿐입니다 —
              읽기 전에 내보낼 일이 없고, 같은 버튼이 위아래에 있으면 어느 쪽이
              최신 편집을 담는지 사용자가 묻게 됩니다.
            */}
            <div className="export-bar">
              <button type="button" className="button button--export" onClick={copyMarkdown}>마크다운 복사</button>
              <button type="button" className="button button--export" onClick={downloadCsv}>CSV 내려받기</button>
            </div>
          </section>
  )
}

function toItemPatch(item: EditableMeeting['items'][number], values: ItemValues): ItemPatch {
  const patch: ItemPatch = {}
  if (values.content !== item.content) patch.content = values.content
  if (values.type !== item.type) patch.type = values.type
  if (JSON.stringify(values.assignee) !== JSON.stringify(item.assignee)) patch.assignee = values.assignee
  if (values.clearedFields?.includes('due') || values.due !== item.due) patch.due = values.due
  return patch
}
