import { SECTIONS } from '../lib/labels.js'
import type { MeetingDateSource, ProcessedMeeting } from '../lib/postprocess.js'
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
 * **빈 칸도 제목을 남깁니다.** 없는 칸을 지우면 회의록에 뭐가 빠졌는지 안 보입니다.
 * 이 순서와 제목이 그대로 섹션 5의 마크다운 내보내기가 됩니다.
 *
 * 다섯 칸 중 넷은 원문 발췌입니다. **논의 내용 한 칸만 AI가 쓴 요약이고,
 * 그 칸에만 "확인이 필요합니다"를 항상 붙입니다.** 검증 여부가 다른데 생김새가
 * 같으면, 읽는 사람이 둘을 같은 신뢰도로 읽습니다.
 *
 * TPO의 시각·장소·목적은 **원문에 있는 값을 그대로 옮긴 것**입니다.
 * 원문에 없으면 "원문에 없음"이라고 적습니다 — 비었다는 사실 자체가 정보입니다.
 */
export default function ResultDoc({
  meeting,
  dateSourceLabel,
}: {
  meeting: ProcessedMeeting
  dateSourceLabel: Record<MeetingDateSource, string>
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

      <Section title="논의 내용" note="AI 요약 · 검증 안 됨">
        {meeting.discussionSummary === null ? (
          <p className="doc-empty">요약할 논의가 없습니다.</p>
        ) : (
          <>
            {/* 경고가 요약보다 위에 옵니다. 읽고 난 뒤에 알려주면 늦습니다 */}
            <p className="doc-unverified">
              <strong>확인이 필요합니다.</strong> 이 칸만 원문 발췌가 아니라 AI가 쓴
              문장입니다. 다른 칸은 원문과 대조해 지어낸 것을 걸러내지만,
              이 칸은 대조할 원문이 없습니다.
            </p>
            <p className="doc-line">{meeting.discussionSummary}</p>
          </>
        )}
      </Section>

      {SECTIONS.map((s) => {
        const items = meeting.items.filter((i) => i.type === s.type)
        return (
          <Section key={s.type} title={s.title} note={s.note} count={items.length}>
            {items.length === 0 ? (
              <p className="doc-empty">{s.empty}</p>
            ) : (
              <div className="items">
                {items.map((i) => (
                  <ItemCard key={i.id} item={i} />
                ))}
              </div>
            )}
          </Section>
        )
      })}
    </div>
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
