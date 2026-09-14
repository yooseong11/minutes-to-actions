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
 * 아직 못 채우는 칸이 둘 있습니다 (TPO의 시각·장소·목적, 논의 내용).
 * 비어 있다고 숨기지 않고 왜 비었는지 적습니다 — 이 프로젝트의 입장입니다.
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
          <div className="field">
            <dt className="field-key">시각</dt>
            <dd className="field-value"><Unfilled /></dd>
          </div>
          <div className="field">
            <dt className="field-key">장소</dt>
            <dd className="field-value"><Unfilled /></dd>
          </div>
          <div className="field">
            <dt className="field-key">목적</dt>
            <dd className="field-value"><Unfilled /></dd>
          </div>
        </dl>
        <p className="doc-todo">
          시각·장소·목적은 아직 뽑지 않습니다. 원문에 있는 정보라 발췌로 가능합니다 —
          스키마에 <code>meetingTimeRaw</code> · <code>meetingPlaceRaw</code> ·
          <code>purposeRaw</code>를 더하고 프롬프트 0단계를 늘리면 됩니다.
        </p>
      </Section>

      <Section title="논의 내용" note="아직 만들지 않음">
        <p className="doc-todo">
          이 칸은 <strong>요약</strong>입니다. 지금 프롬프트의 첫 줄이
          “요약하지 않습니다”이고, AI는 발췌만 하도록 묶여 있습니다.
          채우려면 그 원칙을 어디까지 열지부터 정해야 합니다.
        </p>
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

/** 아직 뽑지 않는 칸. 값이 없는 것과 기능이 없는 것은 다릅니다 */
function Unfilled() {
  return <span className="field-empty">아직 안 뽑음</span>
}
