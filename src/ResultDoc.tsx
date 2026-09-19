import { useState } from 'react'
import type { MeetingDateSource } from '../lib/postprocess.js'
import type { AgendaValues, AttendeeDraft, EditableMeeting, TpoValues } from '../lib/edit.js'
import AgendaDeleteDialog from './AgendaDeleteDialog.js'
import Agenda from './meeting/Agenda.js'
import AttendeeSection from './meeting/AttendeeSection.js'
import TpoSection from './meeting/TpoSection.js'
import Section from './ui/Section.js'

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
                items={meeting.items.filter((i) => i.agendaId === agenda.id)}
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
