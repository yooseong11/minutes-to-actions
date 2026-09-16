/**
 * 05번 더미 결과. **개발 중 화면 확인용입니다.**
 *
 * 원문: `regression/inputs/05_비품_예산_0913.txt`
 * 결과: `regression/runs/20260916-0650/05.json` — 회귀 실행에서 실제 추출한 값을 손대지 않고 옮겼습니다.
 * 회귀 점수를 잴 때 이 파일을 근거로 삼지 마십시오. 그건 실제 추출로만 합니다.
 */
import type { ProcessedMeeting } from '../../lib/postprocess.js'

export const SAMPLE_05_TEXT = "비품/총무 건 (9/13 금 오전 짧게)\n참석: 이수현, 최영호, 정다은\n\n1. 프린터 토너 재고 소진 임박 → 발주. 최영호.\n   (지난달에 5개 샀는데 벌써 다 씀. 이상해서 확인 필요하다는 의견 있었음)\n2. 사무용품 구매처 변경 검토\n   - 현재 업체 배송이 느림\n   - 단가는 지금이 제일 쌈\n   - → 배송 빠른 곳 단가 비교해보고, 차액이 월 10만원 이내면 바꾸는 걸로.\n     넘으면 그냥 유지.\n3. 연말 시상식 기념품 건은 아직 예산 확정 전이라 보류.\n4. 최영호 님 다음 주 수요일 반차라 그날 택배 수령 대신 해줄 사람 필요.\n   정다은 님이 하기로.\n5. 탕비실 커피머신 렌탈 계약 — 자동갱신이라 해지하려면 만료 30일 전에\n   통보해야 함. 만료가 11월 2일.\n6. 우산꽂이 하나 사자는 얘기 나옴.\n\n끝\n"

export const SAMPLE_05: ProcessedMeeting = {
  "meetingDate": "2026-09-13",
  "meetingDateRaw": "9/13",
  "meetingDateSource": "document",
  "meetingTimeRaw": "오전",
  "meetingPlaceRaw": null,
  "purposeRaw": "비품/총무 건",
  "attendees": [
    {
      "nameRaw": "이수현",
      "contextRaw": null
    },
    {
      "nameRaw": "최영호",
      "contextRaw": null
    },
    {
      "nameRaw": "정다은",
      "contextRaw": null
    }
  ],
  "agendas": [
    {
      "id": "1hchqu1",
      "title": "프린터 토너",
      "summary": "지난달에 산 토너 5개를 벌써 모두 사용해 소진 속도가 이상하다는 의견이 있었다."
    },
    {
      "id": "0fl7bwn",
      "title": "사무용품 구매처",
      "summary": "현재 업체는 배송이 느리지만 단가는 가장 저렴해, 배송 속도와 가격 차이를 함께 검토했다."
    },
    {
      "id": "0hkle4x",
      "title": "연말 시상식 기념품",
      "summary": null
    },
    {
      "id": "1ncqzke",
      "title": "택배 수령",
      "summary": "최영호 님이 다음 주 수요일 반차라 택배 수령을 대신할 사람이 필요했다."
    },
    {
      "id": "16dzmny",
      "title": "커피머신 렌탈 계약",
      "summary": null
    },
    {
      "id": "0wo026w",
      "title": "우산꽂이 구매",
      "summary": null
    }
  ],
  "items": [
    {
      "type": "action",
      "content": "프린터 토너 재고 소진 임박 → 발주. 최영호.",
      "assigneeRaw": "최영호",
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "프린터 토너 재고 소진 임박 → 발주. 최영호.",
      "supersededQuote": null,
      "id": "0svqd6j",
      "agendaId": "1hchqu1",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": {
        "nameRaw": "최영호",
        "contextRaw": null
      },
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "action",
      "content": "이상해서 확인 필요하다는 의견 있었음",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "이상해서 확인 필요하다는 의견 있었음",
      "supersededQuote": null,
      "id": "1qb11vd",
      "agendaId": "1hchqu1",
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
      "content": "→ 배송 빠른 곳 단가 비교해보고, 차액이 월 10만원 이내면 바꾸는 걸로.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "conditional",
        "no_assignee"
      ],
      "quote": "→ 배송 빠른 곳 단가 비교해보고, 차액이 월 10만원 이내면 바꾸는 걸로.",
      "supersededQuote": null,
      "id": "0osp8o9",
      "agendaId": "0fl7bwn",
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
      "content": "→ 배송 빠른 곳 단가 비교해보고, 차액이 월 10만원 이내면 바꾸는 걸로.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "conditional"
      ],
      "quote": "→ 배송 빠른 곳 단가 비교해보고, 차액이 월 10만원 이내면 바꾸는 걸로.",
      "supersededQuote": null,
      "id": "1mzq7h5",
      "agendaId": "0fl7bwn",
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
      "content": "넘으면 그냥 유지.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "conditional"
      ],
      "quote": "넘으면 그냥 유지.",
      "supersededQuote": null,
      "id": "0iozc8y",
      "agendaId": "0fl7bwn",
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
      "content": "연말 시상식 기념품 건은 아직 예산 확정 전이라 보류.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": "예산 확정 전",
      "reviewReasons": [
        "blocked"
      ],
      "quote": "연말 시상식 기념품 건은 아직 예산 확정 전이라 보류.",
      "supersededQuote": null,
      "id": "10z79cu",
      "agendaId": "0hkle4x",
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
      "content": "정다은 님이 하기로.",
      "assigneeRaw": "정다은",
      "assigneeContextRaw": null,
      "dueDateRaw": "다음 주 수요일",
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [],
      "quote": "정다은 님이 하기로.",
      "supersededQuote": null,
      "id": "1hr93x2",
      "agendaId": "1ncqzke",
      "due": "2026-09-16",
      "dueAnchor": null,
      "dueMethod": "relative",
      "assignee": {
        "nameRaw": "정다은",
        "contextRaw": null
      },
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "high"
    },
    {
      "type": "action",
      "content": "탕비실 커피머신 렌탈 계약 — 자동갱신이라 해지하려면 만료 30일 전에\n   통보해야 함.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": "만료 30일 전에",
      "anchorDateRaw": "11월 2일",
      "blockedByRaw": null,
      "reviewReasons": [
        "no_assignee"
      ],
      "quote": "탕비실 커피머신 렌탈 계약 — 자동갱신이라 해지하려면 만료 30일 전에\n   통보해야 함.",
      "supersededQuote": null,
      "id": "1byzi9b",
      "agendaId": "16dzmny",
      "due": "2026-10-03",
      "dueAnchor": "2026-11-02",
      "dueMethod": "backward",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    },
    {
      "type": "open",
      "content": "우산꽂이 하나 사자는 얘기 나옴.",
      "assigneeRaw": null,
      "assigneeContextRaw": null,
      "dueDateRaw": null,
      "anchorDateRaw": null,
      "blockedByRaw": null,
      "reviewReasons": [
        "ambiguous_intent"
      ],
      "quote": "우산꽂이 하나 사자는 얘기 나옴.",
      "supersededQuote": null,
      "id": "18wzy7f",
      "agendaId": "0wo026w",
      "due": null,
      "dueAnchor": null,
      "dueMethod": "none",
      "assignee": null,
      "assigneeCandidates": [],
      "preselect": false,
      "confidence": "needs_review"
    }
  ],
  "rejected": []
}
