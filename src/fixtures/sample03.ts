/**
 * 03번 더미 결과. **개발 중 화면 확인용입니다.**
 *
 * 원문: `regression/inputs/03_전사_정기보고_준비_0911.txt`
 * 결과: `regression/runs/20260916-0650/03.json` — 회귀 실행에서 실제 추출한 값을 손대지 않고 옮겼습니다.
 * 회귀 점수를 잴 때 이 파일을 근거로 삼지 마십시오. 그건 실제 추출로만 합니다.
 */
import type { ProcessedMeeting } from '../../lib/postprocess.js'

export const SAMPLE_03_TEXT = "[메모] 9/11 오후, 팀장님이랑 둘이 잠깐 얘기한 거 정리\n\n- 다음 주 수요일 임원보고 자료 준비해야 함.\n- 각 부서에서 자료 받아야 하는데 매번 양식이 다르게 와서 취합이 오래 걸림.\n  올해는 양식 통일해서 미리 돌리자고 함. 양식 만드는 건 내가.\n- 작년 자료 기준으로 목차는 그대로 가되, 인력 현황 부분만 새로 추가.\n- 인력 현황 숫자는 인사 쪽에서 받아야 하는데 거기 담당자가 휴가라\n  돌아오면 요청하기로. (언제 돌아오는지는 못 들음)\n- 발표는 팀장님이 하심.\n- 자료 취합 마감은 화요일 오전. 그래야 하루 전에 검토 가능.\n- 아 그리고 지난번 얘기했던 회의실 예약 시스템 건은 이번엔 안 올리기로 함.\n  급한 거 아니니까.\n"

export const SAMPLE_03: ProcessedMeeting = {
  "meetingDate": "2026-09-11",
  "meetingDateRaw": "9/11",
  "meetingDateSource": "document",
  "meetingTimeRaw": "오후",
  "meetingPlaceRaw": null,
  "purposeRaw": null,
  "attendees": [
    {
      "nameRaw": "팀장님",
      "contextRaw": null
    }
  ],
  "agendas": [
    {
      "id": "195wtth",
      "title": "임원보고 자료 준비",
      "summary": "각 부서에서 보내는 자료의 양식이 매번 달라 취합이 오래 걸리는 문제가 있었다. 인력 현황 숫자는 인사 쪽 담당자가 휴가 중이고 복귀 시점도 확인되지 않았다."
    }
  ],
  "items": [
    {
      "type": "action",
      "content": "다음 주 수요일 임원보고 자료 준비해야 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "다음 주 수요일",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "다음 주 수요일 임원보고 자료 준비해야 함.",
      "supersededQuote": null,
      "id": "1olbzup",
      "agendaId": "195wtth",
      "due": "2026-09-16",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "open",
      "content": "올해는 양식 통일해서 미리 돌리자고 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "ambiguous_intent"
      ],
      "quote": "올해는 양식 통일해서 미리 돌리자고 함.",
      "supersededQuote": null,
      "id": "121ym54",
      "agendaId": "195wtth",
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
      "content": "양식 만드는 건 내가.",
      "assigneeRaw": "내가",
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "assignee_unknown"
      ],
      "quote": "양식 만드는 건 내가.",
      "supersededQuote": null,
      "id": "0ywq9cv",
      "agendaId": "195wtth",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "decision",
      "content": "작년 자료 기준으로 목차는 그대로 가되, 인력 현황 부분만 새로 추가.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "작년 자료 기준으로 목차는 그대로 가되, 인력 현황 부분만 새로 추가.",
      "supersededQuote": null,
      "id": "1oezmud",
      "agendaId": "195wtth",
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
      "content": "돌아오면 요청하기로.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": "돌아오면",
      "reviewReasons": [
        "no_assignee",
        "blocked"
      ],
      "quote": "돌아오면 요청하기로.",
      "supersededQuote": null,
      "id": "1wnbjfe",
      "agendaId": "195wtth",
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
      "content": "발표는 팀장님이 하심.",
      "assigneeRaw": "팀장님",
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "발표는 팀장님이 하심.",
      "supersededQuote": null,
      "id": "0h9l2ku",
      "agendaId": "195wtth",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "decision",
      "content": "자료 취합 마감은 화요일 오전.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "화요일 오전",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "자료 취합 마감은 화요일 오전.",
      "supersededQuote": null,
      "id": "0g32rxq",
      "agendaId": "195wtth",
      "due": "2026-09-15",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    }
  ],
  "rejected": []
}
