import { useState } from 'react'
import { createItem, editItem, recalculateMeeting, type EditableMeeting } from '../lib/edit.js'
import type { MeetingDateSource, ProcessedMeeting } from '../lib/postprocess.js'
import type { ItemType } from '../lib/types.js'
import ItemForm from './ItemForm.js'
import ResultDoc from './ResultDoc.js'

const DATE_SOURCE_LABEL: Record<MeetingDateSource, string> = {
  user: '고르신 날짜를 기준으로 계산했어요',
  document: '회의록 원문에 적힌 날짜를 기준으로 계산했어요',
  fallback: '원문에 회의 날짜가 없어서 오늘을 기준으로 계산했어요',
  none: '기준 날짜가 없어서 기한을 환산하지 못했어요',
}

export default function MeetingEditor({ meeting }: { meeting: ProcessedMeeting }) {
  const [draft, setDraft] = useState<EditableMeeting>(meeting)
  const [history, setHistory] = useState<EditableMeeting[]>([])
  const [dateInput, setDateInput] = useState(meeting.meetingDate ?? '')
  const [adding, setAdding] = useState<ItemType | null>(null)
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
    setDateInput(previous.meetingDate ?? '')
    setHistory(history.slice(0, -1))
    setRestoreVersion(version => version + 1)
    setAdding(null)
    setNotice('마지막 변경을 되돌렸어요.')
  }
  return (
          <section className="result">
            <p className="summary">
              항목 {draft.items.length}개
              {' · '}손볼 항목 {draft.items.filter((i) => i.confidence === 'needs_review').length}개
            </p>

            <p className="hint">수정은 이 화면에 적용됩니다. 새로고침하거나 다시 추출하면 초기화됩니다.</p>
            <div className="actions">
              <button type="button" className="button button--quiet" disabled={!history.length} onClick={undo}>마지막 변경 되돌리기</button>
              <span role="status" className="hint">{notice}</span>
            </div>
            {adding && <div className="item">
              <h2 className="item-content">새 안건</h2>
              <ItemForm key={adding} adding attendees={draft.attendees}
                initial={{ type: adding, content: '', assignee: null, due: null }} onCancel={() => setAdding(null)}
                onSave={values => {
                  commit({ ...draft, items: [...draft.items, createItem(crypto.randomUUID(), values.type, values.content, values.assignee, values.due)] }, '안건을 추가했어요.')
                  setAdding(null)
                }} />
            </div>}
            {/* 기한 환산은 전부 이 날짜를 기준으로 역산합니다.
                기준이 틀리면 기한이 조용히 다 틀리므로 숨기지 않습니다. */}
            <div className="anchor">
              <label className="anchor-label" htmlFor="meeting-date">
                기한 계산 기준일
              </label>
              <input
                id="meeting-date"
                className="anchor-input"
                type="date"
                value={dateInput}
                onInput={(e) => setDateInput(e.currentTarget.value)}
              />
              <button className="button button--quiet" type="button" onClick={() => {
                commit(recalculateMeeting(draft, dateInput || null), '기준일을 적용했어요. 직접 수정한 기한은 유지됩니다.')
              }}>
                다시 계산
              </button>
              {/* 원문 표현과 실제 기준일이 다르면 그 사실을 남깁니다 */}
              {draft.meetingDateRaw && draft.meetingDateSource !== 'document' && (
                <span className="hint">원문에는 “{draft.meetingDateRaw}”라고 적혀 있어요.</span>
              )}
            </div>

            <ResultDoc key={restoreVersion} meeting={draft} dateSourceLabel={DATE_SOURCE_LABEL} onAdd={setAdding}
              onEdit={(id, patch) => {
                if (!Object.keys(patch).length) return
                commit({ ...draft, items: draft.items.map(item => item.id === id ? editItem(item, patch) : item) }, '수정을 적용했어요.')
              }}
              onDelete={id => commit({ ...draft, items: draft.items.filter(item => item.id !== id) }, '안건을 삭제했어요. 되돌릴 수 있습니다.')} />

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

            {/* 현재 편집값과 최초 추출 결과를 함께 확인할 수 있습니다. */}
            <details className="raw-wrap">
              <summary className="raw-summary">현재 편집 결과 (JSON)</summary>
              <pre className="raw">{JSON.stringify(draft, null, 2)}</pre>
            </details>
          </section>
  )
}
