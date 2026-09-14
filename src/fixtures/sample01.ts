/**
 * 01번 주간업무회의 더미 결과. **개발 중 화면 확인용입니다.**
 *
 * 왜 있나: 카드 하나 고칠 때마다 추출을 돌리면 매번 OpenAI 토큰이 나갑니다.
 * 이 파일은 `postprocess()`를 실제로 돌려서 뽑은 결과를 그대로 굳힌 것이라,
 * 화면이 받는 모양과 정확히 같습니다.
 *
 * 정직하게 적어 둡니다 — **항목 1~4만 AI가 실제로 뽑은 것**입니다.
 * 5~7은 배지·취소선·환각 제외를 화면에서 다 보려고 손으로 만든 합성 항목입니다.
 * 회귀 점수를 잴 때 이 파일을 근거로 삼지 마십시오. 그건 실제 추출로만 합니다.
 *
 * 스키마가 바뀌면 `tsc`가 여기서 먼저 터집니다. 타입을 박아 둔 이유입니다.
 * 다시 만들려면 `postprocess(raw, 원문, null, '2026-09-14')`의 결과로 갈아끼우면 됩니다.
 *
 * TPO 세 칸(`meetingTimeRaw`·`meetingPlaceRaw`·`purposeRaw`)은 실제 추출이 아니라
 * **원문에서 손으로 옮긴 값**입니다. 코드가 계산하지 않고 그대로 통과시키는 칸이라
 * 화면 확인에는 같은 값이지만, 프롬프트가 저 셋을 잘 뽑는지는 이 파일로 알 수 없습니다.
 * 그건 회귀 측정에서 실제 추출로 확인할 일입니다.
 *
 * **안건(`agendas`)도 손으로 묶은 것입니다.** 4.5에서 스키마가 바뀌면서 기존 항목
 * 6개를 화제별로 4개 안건에 나눠 넣고, 제목과 요약을 사람이 썼습니다.
 * 프롬프트가 안건을 잘 가르는지는 이 파일로 알 수 없습니다 — 회귀 6차가 잴 일입니다.
 * `id`는 실제 코드와 같은 방식(`agenda|순번|제목`의 해시)으로 만들었습니다.
 */
import type { ProcessedMeeting } from '../../lib/postprocess.js'

export const SAMPLE_01_TEXT = "주간 업무회의\n2026-09-08 (월) 10:00 / 대회의실\n참석: 박팀장, 김민수, 이수현, 정다은, 최영호(중간 합류)\n\n- 지난주 채용공고 3건 게시 완료. 지원자 총 41명.\n- 서류 검토는 김 대리가 이번 주 안에 마무리하기로.\n  근데 41명이면 좀 많은데... 팀장님: \"일단 1차는 혼자 보고, 넘기기 애매한 건 같이 보죠\"\n- 이수현: 법인카드 사용내역 정산이 8월분 아직 안 끝났음. 영수증 누락 4건.\n  → 해당 사용자들한테 개별로 연락 돌리기로. 이건 정다은 님이.\n- 사무실 정수기 계약 만료 다음 달인데 연장할지 교체할지.\n  최영호: \"지금 거 자주 고장나요\" / 박팀장: \"견적 몇 개 받아보고 다시 얘기합시다\"\n  (결론 안 남)\n- 점심 뭐 먹을지 얘기하다가 근처 새로 생긴 국밥집 얘기 나옴. 다들 가보자고 함.\n- 신규 입사자 노트북 2대 발주 건은 지난주에 이미 완료됨. 확인만.\n- 민수씨가 말한 근태 시스템 오류 건, 담주 화요일까지 벤더에 문의 넣기로.\n\n다음 회의: 9/15(월) 같은 시간\n"

export const SAMPLE_01: ProcessedMeeting = {
  "meetingDate": "2026-09-08",
  "meetingDateRaw": "2026-09-08",
  "meetingDateSource": "document",
  "meetingTimeRaw": "10:00",
  "meetingPlaceRaw": "대회의실",
  "purposeRaw": "주간 업무회의",
  "attendees": [
    {
      "nameRaw": "박팀장",
      "contextRaw": null
    },
    {
      "nameRaw": "김민수",
      "contextRaw": null
    },
    {
      "nameRaw": "이수현",
      "contextRaw": null
    },
    {
      "nameRaw": "정다은",
      "contextRaw": null
    },
    {
      "nameRaw": "최영호",
      "contextRaw": "중간 합류"
    }
  ],
  "agendas": [
    {
      "id": "0a5f4tq",
      "title": "채용 서류 검토",
      "summary": "지난주 게시한 채용공고로 지원자가 41명 모였고, 서류 검토 분량이 한 사람이 보기에 많다는 말이 나왔다. 1차는 혼자 보고 넘기기 애매한 건만 함께 보는 쪽으로 조율했다."
    },
    {
      "id": "1fu5228",
      "title": "법인카드 정산",
      "summary": "8월분 법인카드 정산이 영수증 누락 4건 때문에 아직 끝나지 않은 상태가 보고되었다."
    },
    {
      "id": "1wmlks1",
      "title": "사무실 정수기 계약",
      "summary": "계약 만료를 앞두고 연장과 교체로 의견이 갈렸다. 지금 것이 자주 고장난다는 의견과 견적을 더 받아보자는 의견이 맞서 결론이 나지 않았다."
    },
    {
      "id": "1h6d79c",
      "title": "근태 시스템 오류",
      "summary": null
    }
  ],
  "items": [
    {
      "type": "action",
      "content": "서류 검토는 김 대리가 이번 주 안에 마무리하기로.",
      "assigneeRaw": "김 대리",
      "assigneeContextRaw": null,
      "dueDateRaw": "이번 주 안에",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "assignee_unmatched"
      ],
      "quote": "서류 검토는 김 대리가 이번 주 안에 마무리하기로.",
      "supersededQuote": null,
      "id": "0paj5p9",
      "agendaId": "0a5f4tq",
      "due": "2026-09-13",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": null,
      "assigneeCandidates": [
        {
          "nameRaw": "김민수",
          "contextRaw": null
        }
      ],
      "preselect": true,
      "confidence": "needs_review"
    },
    {
      "type": "action",
      "content": "영수증 누락 4건 관련 사용자들에게 개별 연락 돌리기로.",
      "assigneeRaw": "정다은",
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "해당 사용자들한테 개별로 연락 돌리기로. 이건 정다은 님이.",
      "supersededQuote": null,
      "id": "1d9zyib",
      "agendaId": "1fu5228",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": {
        "nameRaw": "정다은",
        "contextRaw": null
      },
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "open",
      "content": "사무실 정수기 계약 만료 다음 달인데 연장할지 교체할지 검토하기로 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "사무실 정수기 계약 만료 다음 달인데 연장할지 교체할지.",
      "supersededQuote": null,
      "id": "0zfkl6g",
      "agendaId": "1wmlks1",
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
      "content": "근태 시스템 오류 건 벤더에 문의 넣기로 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "담주 화요일까지",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "민수씨가 말한 근태 시스템 오류 건, 담주 화요일까지 벤더에 문의 넣기로.",
      "supersededQuote": null,
      "id": "1w1isj0",
      "agendaId": "1h6d79c",
      "due": "2026-09-15",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "open",
      "content": "정수기 견적 비교 — A사 3천, B사 4천2백",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": "견적 수령",
      "reviewReasons": [
        "conditional",
        "unit_unclear",
        "blocked"
      ],
      "quote": "최영호: \"지금 거 자주 고장나요\"",
      "supersededQuote": null,
      "id": "1rw8tbv",
      "agendaId": "1wmlks1",
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
      "content": "정수기 건 원점으로 (번복 예시)",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "superseded"
      ],
      "quote": "(결론 안 남)",
      "supersededQuote": "신규 입사자 노트북 2대 발주 건은 지난주에 이미 완료됨. 확인만.",
      "id": "10b752c",
      "agendaId": "1wmlks1",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    }
  ],
  "rejected": [
    {
      "item": {
        "type": "decision",
        "content": "환각 예시 — 원문에 없는 인용문",
        "assigneeRaw": null,
        "assigneeContextRaw": null,
        "dueDateRaw": null,
        "anchorDateRaw": null,
        "blockedByRaw": null,
        "reviewReasons": [],
        "quote": "원문에 전혀 없는 문장입니다.",
        "supersededQuote": null
      },
      "hallucinated": [
        "quote"
      ]
    }
  ]
}
