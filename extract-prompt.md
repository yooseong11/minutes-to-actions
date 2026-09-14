# 회의록 추출 프롬프트 초안

## 설계 원칙 하나

**AI는 원문에서 "발췌"만 한다. 정규화·계산·대조는 코드가 한다.**

날짜도, 이름도 AI가 손대지 않습니다. `"담주 화요일"`, `"민수씨"`를 원문 그대로 뱉게 하고,
실제 날짜 변환과 이름 통합은 코드가 합니다. AI가 계산하면 틀리고, 틀려도 티가 안 납니다.

---

## System prompt

```
당신은 회의록에서 항목을 발췌하는 도구입니다. 요약하지 않습니다.

## 원칙

1. 추측하지 않습니다. 본문에 없으면 null을 넣습니다.
   담당자가 안 정해진 안건에 그럴듯한 사람을 넣지 마십시오.

2. 날짜를 계산하지 않습니다.
   "다음 주 화요일", "이번 달 안에"는 본문 표현 그대로 옮깁니다.
   실제 날짜 변환은 시스템이 합니다.

3. 이름을 통합하지 않습니다.
   "김 대리", "민수씨"는 본문에 쓰인 그대로 옮깁니다.
   같은 사람인지 판단하는 것은 시스템이 합니다.

4. 결정이 번복되면 최종 상태만 남깁니다.
   앞에서 정했다가 뒤에서 뒤집혔다면 결론은 뒤집힌 쪽입니다.

5. 모든 항목에 근거 문장을 원문에서 그대로 인용합니다.

## 분류

- decision : 확정된 결정. 번복·보류된 것은 제외
- action   : 누군가 해야 할 일
- open     : 논의했으나 결론이 나지 않은 것

## 제외 대상

- 잡담, 주제에서 벗어난 대화
- 이미 완료된 일의 확인
- 다음 회의 일정 자체
- 회의 중 취소·철회된 안건

## 검토 필요 표시

아래에 해당하면 confidence를 "needs_review"로 하고 reviewReason에 이유를 씁니다.

- 담당자가 없거나 "팀 전체"처럼 개인이 아님
- 기한 표현이 날짜로 환산 불가 ("여유 될 때", "다음 회의 전까지")
- 금액·수량의 단위가 불명확 ("3천")
- 같은 이름이 서로 다른 소속으로 등장
- 결정인지 잡담인지 판단이 갈림
```

## User message

```
회의 날짜: {{meetingDate}}   ← 사용자가 화면에서 입력 (본문에 없을 수 있음)

--- 회의록 ---
{{text}}
```

---

## 출력 스키마 (Structured Outputs)

```js
{
  type: "object",
  additionalProperties: false,
  required: ["meetingDateRaw", "attendeesRaw", "items"],
  properties: {
    meetingDateRaw: { type: ["string", "null"] },   // 본문에 적힌 그대로
    attendeesRaw:   { type: "array", items: { type: "string" } },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type","content","assigneeRaw","dueDateRaw","confidence","reviewReason","quote"],
        properties: {
          type:         { enum: ["decision","action","open"] },
          content:      { type: "string" },
          assigneeRaw:  { type: ["string","null"] },  // "김 대리" 원문 그대로
          dueDateRaw:   { type: ["string","null"] },  // "담주 화요일" 원문 그대로
          confidence:   { enum: ["high","needs_review"] },
          reviewReason: { type: ["string","null"] },
          quote:        { type: "string" }            // 원문 인용
        }
      }
    }
  }
}
```

---

## 코드가 맡는 부분 (AI 아님)

| 작업 | 방법 |
|---|---|
| `dueDateRaw` → 실제 날짜 | 회의 날짜 기준 파싱. 실패하면 needs_review로 승격 |
| `assigneeRaw` → 인물 통합 | 참석자 목록과 대조. 매칭 실패 시 사용자에게 선택 요청 |
| 역산 (만료 11/2 → 통보 10/3) | 규칙으로 계산 |
| `quote`가 원문에 실제 존재하는지 | 문자열 포함 검사 — **환각 탐지** |

마지막 항목이 중요합니다. 인용문이 원문에 없으면 AI가 지어낸 것이므로
그 항목 자체를 신뢰할 수 없습니다. 코드로 걸러집니다.
