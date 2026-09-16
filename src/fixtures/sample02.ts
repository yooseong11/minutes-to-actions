/**
 * 02번 더미 결과. **개발 중 화면 확인용입니다.**
 *
 * 원문: `regression/inputs/02_외주계약_논의_0910.md`
 * 결과: `regression/runs/20260916-0650/02.json` — 회귀 실행에서 실제 추출한 값을 손대지 않고 옮겼습니다.
 * 회귀 점수를 잴 때 이 파일을 근거로 삼지 마십시오. 그건 실제 추출로만 합니다.
 */
import type { ProcessedMeeting } from '../../lib/postprocess.js'

export const SAMPLE_02_TEXT = "# 홈페이지 리뉴얼 외주 건 논의\n\n일시: 9월 10일 오후 2시\n참석: 경영지원 박팀장 / 김민수(회계) / 개발팀 김민수 / 외부 없음\n\n---\n\n- 업체 A, B 견적 비교함.\n  - A사: 3천 / 8주\n  - B사: 4천2백 / 6주\n- 김민수: \"A가 싸긴 한데 포트폴리오가 좀 약해요\"\n  (※ 이 발언은 개발팀 쪽)\n- 회계 쪽 김민수: 올해 예산으로는 A가 맞다. B는 내년 예산 끌어와야 함.\n\n**일단 A사로 가는 걸로 정함.**\n\n...근데 회의 끝날 때쯤 박팀장이 \"A사 작년에 다른 팀이 썼다가 안 좋았다는 말\n들은 것 같은데\" 라고 해서 다시 원점. 확인해보고 결정하기로 함.\n→ 다른 팀 담당자한테 물어보는 건 누가 할지는 안 정함\n\n- 계약서 초안 검토는 업체 확정된 뒤에.\n- 착수는 늦어도 이번 달 안에 해야 연내 오픈 가능하다고 함.\n\n다음: 업체 확정되면 바로 재소집\n"

export const SAMPLE_02: ProcessedMeeting = {
  "meetingDate": "2026-09-10",
  "meetingDateRaw": "9월 10일",
  "meetingDateSource": "document",
  "meetingTimeRaw": "오후 2시",
  "meetingPlaceRaw": null,
  "purposeRaw": "홈페이지 리뉴얼 외주 건 논의",
  "attendees": [
    {
      "nameRaw": "박팀장",
      "contextRaw": "경영지원"
    },
    {
      "nameRaw": "김민수",
      "contextRaw": "회계"
    },
    {
      "nameRaw": "김민수",
      "contextRaw": "개발팀"
    }
  ],
  "agendas": [
    {
      "id": "1q0r0y7",
      "title": "외주 업체 선정",
      "summary": "A사와 B사의 견적, 기간, 포트폴리오와 예산 조건을 비교했다. A사로 정했다가 다른 팀의 좋지 않은 사용 경험 가능성이 제기되어 업체 결정을 다시 검토하게 됐다."
    }
  ],
  "items": [
    {
      "type": "open",
      "content": "...근데 회의 끝날 때쯤 박팀장이 \"A사 작년에 다른 팀이 썼다가 안 좋았다는 말\n들은 것 같은데\" 라고 해서 다시 원점.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "superseded"
      ],
      "quote": "...근데 회의 끝날 때쯤 박팀장이 \"A사 작년에 다른 팀이 썼다가 안 좋았다는 말\n들은 것 같은데\" 라고 해서 다시 원점.",
      "supersededQuote": "일단 A사로 가는 걸로 정함.",
      "id": "034cu39",
      "agendaId": "1q0r0y7",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "action",
      "content": "→ 다른 팀 담당자한테 물어보는 건 누가 할지는 안 정함",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "→ 다른 팀 담당자한테 물어보는 건 누가 할지는 안 정함",
      "supersededQuote": null,
      "id": "1s0iubf",
      "agendaId": "1q0r0y7",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "action",
      "content": "계약서 초안 검토는 업체 확정된 뒤에.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": "업체 확정된 뒤에",
      "reviewReasons": [
        "no_assignee",
        "blocked"
      ],
      "quote": "계약서 초안 검토는 업체 확정된 뒤에.",
      "supersededQuote": null,
      "id": "07duj7l",
      "agendaId": "1q0r0y7",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "action",
      "content": "착수는 늦어도 이번 달 안에 해야 연내 오픈 가능하다고 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "이번 달 안에",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "착수는 늦어도 이번 달 안에 해야 연내 오픈 가능하다고 함.",
      "supersededQuote": null,
      "id": "1gp8x7t",
      "agendaId": "1q0r0y7",
      "due": "2026-09-30",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    }
  ],
  "rejected": []
}
