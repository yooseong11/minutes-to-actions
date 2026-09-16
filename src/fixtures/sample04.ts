/**
 * 04번 더미 결과. **개발 중 화면 확인용입니다.**
 *
 * 원문: `regression/inputs/04_회의록_전사본_0912.txt`
 * 결과: `regression/runs/20260916-0650/04.json` — 회귀 실행에서 실제 추출한 값을 손대지 않고 옮겼습니다.
 * 회귀 점수를 잴 때 이 파일을 근거로 삼지 마십시오. 그건 실제 추출로만 합니다.
 */
import type { ProcessedMeeting } from '../../lib/postprocess.js'

export const SAMPLE_04_TEXT = "(음성 자동 전사 - 오타 있을 수 있음)\n2026.09.12 14:03 ~ 14:41\n\n[14:03] 박팀장: 자 시작하죠. 오늘은 사내 문의 대응 건인데요\n[14:04] 정다은: 네 저번에 말씀드린 대로 슬랙으로 오는 질문이 하루에 열 몇 개 되는데 절반 이상이 연차나 경비 규정 같은 거예요\n[14:06] 박팀장: 그거 다 답해주고 있어요?\n[14:06] 정다은: 네 근데 같은 질문이 반복돼서...\n[14:07] 이수현: 규정집을 공지해도 안 읽더라고요\n[14:09] 박팀장: 그럼 자주 묻는 거 정리해서 FAQ 만들어봅시다. 정다은 씨가 한 달치 질문 뽑아서 분류해주시고\n[14:10] 정다은: 넵 언제까지 드릴까요\n[14:10] 박팀장: 급한 건 아니고 여유 될 때\n[14:14] 이수현: FAQ 어디다 올리죠 노션이요?\n[14:15] 박팀장: 노션이 접근이 안 되는 분들도 있어서... 그거는 좀 알아봐야 할 것 같은데\n[14:18] (잡담 - 주차장 공사 관련)\n[14:26] 정다은: 아 그리고 경비 정산 마감일 좀 앞당기면 안 될까요 매달 말일이라 월말에 몰려서\n[14:27] 박팀장: 그건 재무팀이랑 얘기해야 돼요\n[14:28] 이수현: 제가 재무팀 이번 주에 볼 일 있어서 그때 물어볼게요\n[14:33] 박팀장: 그리고 다음 달 워크샵 장소 후보 세 군데 정도 뽑아주세요\n[14:34] 이수현: 제가요?\n[14:34] 박팀장: 네 수현 씨가\n[14:35] 이수현: 언제까지요\n[14:35] 박팀장: 음... 다음 회의 전까지\n[14:41] 종료\n"

export const SAMPLE_04: ProcessedMeeting = {
  "meetingDate": "2026-09-12",
  "meetingDateRaw": "2026.09.12",
  "meetingDateSource": "document",
  "meetingTimeRaw": "14:03 ~ 14:41",
  "meetingPlaceRaw": null,
  "purposeRaw": null,
  "attendees": [
    {
      "nameRaw": "박팀장",
      "contextRaw": null
    },
    {
      "nameRaw": "정다은",
      "contextRaw": null
    },
    {
      "nameRaw": "이수현",
      "contextRaw": null
    }
  ],
  "agendas": [
    {
      "id": "0w6cbhq",
      "title": "사내 문의 대응",
      "summary": "슬랙에 연차나 경비 규정과 관련된 같은 질문이 반복되고 있다. 노션은 접근이 안 되는 사람도 있어 FAQ 게시 위치는 더 알아볼 필요가 있다."
    },
    {
      "id": "0i6tlhk",
      "title": "경비 정산 마감일",
      "summary": "매달 말일에 정산이 몰리는 문제로 마감일을 앞당길 수 있는지 논의했다. 재무팀과의 협의가 필요하다."
    },
    {
      "id": "014s06h",
      "title": "다음 달 워크샵 장소",
      "summary": null
    }
  ],
  "items": [
    {
      "type": "decision",
      "content": "그럼 자주 묻는 거 정리해서 FAQ 만들어봅시다.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "그럼 자주 묻는 거 정리해서 FAQ 만들어봅시다.",
      "supersededQuote": null,
      "id": "0elxdam",
      "agendaId": "0w6cbhq",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "action",
      "content": "정다은 씨가 한 달치 질문 뽑아서 분류해주시고",
      "assigneeRaw": "정다은 씨",
      "assigneeContextRaw": null,
      "dueDateRaw": "여유 될 때",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "due_unparseable"
      ],
      "quote": "정다은 씨가 한 달치 질문 뽑아서 분류해주시고",
      "supersededQuote": null,
      "id": "14trl5l",
      "agendaId": "0w6cbhq",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "failed",
      "assignee": {
        "nameRaw": "정다은",
        "contextRaw": null
      },
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "open",
      "content": "FAQ 어디다 올리죠 노션이요?",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "FAQ 어디다 올리죠 노션이요?",
      "supersededQuote": null,
      "id": "1uvrrwm",
      "agendaId": "0w6cbhq",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "action",
      "content": "그거는 좀 알아봐야 할 것 같은데",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "그거는 좀 알아봐야 할 것 같은데",
      "supersededQuote": null,
      "id": "14srfib",
      "agendaId": "0w6cbhq",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "open",
      "content": "아 그리고 경비 정산 마감일 좀 앞당기면 안 될까요 매달 말일이라 월말에 몰려서",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "아 그리고 경비 정산 마감일 좀 앞당기면 안 될까요 매달 말일이라 월말에 몰려서",
      "supersededQuote": null,
      "id": "1sblog8",
      "agendaId": "0i6tlhk",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "action",
      "content": "제가 재무팀 이번 주에 볼 일 있어서 그때 물어볼게요",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "이번 주에",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "due_unparseable",
        "no_assignee"
      ],
      "quote": "제가 재무팀 이번 주에 볼 일 있어서 그때 물어볼게요",
      "supersededQuote": null,
      "id": "03wezz7",
      "agendaId": "0i6tlhk",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "failed",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "action",
      "content": "그리고 다음 달 워크샵 장소 후보 세 군데 정도 뽑아주세요",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "다음 회의 전까지",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "due_unparseable",
        "no_assignee"
      ],
      "quote": "그리고 다음 달 워크샵 장소 후보 세 군데 정도 뽑아주세요",
      "supersededQuote": null,
      "id": "1hlpr8j",
      "agendaId": "014s06h",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "failed",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    }
  ],
  "rejected": []
}
