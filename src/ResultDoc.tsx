import { ITEM_TYPE, SECTIONS } from '../lib/labels.js'
import type { MeetingDateSource } from '../lib/postprocess.js'
import type { EditableItem, EditableMeeting, ItemPatch } from '../lib/edit.js'
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
 * TPO의 시각·장소·목적은 **원문에 있는 값을 그대로 옮긴 것**입니다.
 * 원문에 없으면 "원문에 없음"이라고 적습니다 — 비었다는 사실 자체가 정보입니다.
 */

/** 안건 안에서 항목을 읽는 순서. 결정 → 할 일 → 미결 (SECTIONS가 단일 출처) */
const TYPE_ORDER = SECTIONS.map((s) => s.type)

export default function ResultDoc({
  meeting,
  dateSourceLabel,
  onEdit, onDelete, onAdd,
}: {
  meeting: EditableMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
  onEdit: (id: string, patch: ItemPatch) => void
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

      <Section title="TPO" note="시각 · 장소 · 목적">
        <dl className="tpo">
          <div className="field">
            <dt className="field-key">날짜</dt>
            <dd className="field-value">
              {meeting.meetingDate ?? <span className="field-empty">—</span>}
              <span className="field-raw">{dateSourceLabel[meeting.meetingDateSource]}</span>
            </dd>
          </div>
          <Field label="시각" value={meeting.meetingTimeRaw} />
          <Field label="장소" value={meeting.meetingPlaceRaw} />
          <Field label="목적" value={meeting.purposeRaw} />
        </dl>
      </Section>

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
                attendees={meeting.attendees}
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
  title, summary, items, attendees, onEdit, onDelete, onAdd,
}: {
  title: string
  summary: string | null
  items: EditableItem[]
  attendees: EditableMeeting['attendees']
  onEdit: (id: string, patch: ItemPatch) => void
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
        <div className="items">
          {items.map((i) => (
            <div className="agenda-item" key={i.id}>
              {/* 분류는 섹션 제목이 없어졌으므로 항목마다 답니다 */}
              <span className={`type-tag type-tag--${i.type}`}>{ITEM_TYPE[i.type]}</span>
              <ItemCard
                item={i}
                attendees={attendees}
                onEdit={(patch) => onEdit(i.id, patch)}
                onDelete={() => onDelete(i.id)}
              />
            </div>
          ))}
        </div>
      )}

      <button type="button" className="button button--add" onClick={onAdd}>
        + 이 안건에 항목 추가
      </button>
    </section>
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

/**
 * 원문에서 그대로 옮긴 한 칸. 환산도 대조도 없습니다.
 *
 * 값이 없을 때 칸을 지우지 않고 "원문에 없음"을 남깁니다.
 * 회의록에 장소가 안 적혀 있다는 것은, 장소 칸이 화면에 없는 것과 다릅니다.
 */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="field">
      <dt className="field-key">{label}</dt>
      <dd className="field-value">
        {value ?? <span className="field-empty">원문에 없음</span>}
      </dd>
    </div>
  )
}
