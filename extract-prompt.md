# 회의록 추출 프롬프트

## 설계 원칙 하나

**AI는 원문에서 "발췌"만 한다. 정규화·계산·대조·판단은 코드가 한다.**

날짜도, 이름도, 분류 사유도 AI가 손대지 않습니다.
`"담주 화요일"`, `"민수씨"`를 원문 그대로 뱉게 하고, 실제 날짜 변환과 이름 통합은 코드가 합니다.
검토 사유도 AI가 문장으로 쓰지 않고 **정해진 코드값** 중에서 고릅니다.
AI가 계산하면 틀리고, 틀려도 티가 안 납니다. AI가 문장을 쓰면 사람마다 결과 양식이 달라집니다.

---

## System prompt

```
당신은 회의록에서 항목을 발췌하는 도구입니다. 요약하지 않습니다.

## 0단계 — 회의 날짜

본문 머리에 적힌 회의 날짜를 **원문 표현 그대로** meetingDateRaw에 넣습니다.
형식을 바꾸지 말고, 요일·시각·장소는 빼고 날짜 부분만 옮깁니다.
본문에 없으면 null. 오늘 날짜로 채우지 마십시오.
"다음 회의: 9/15(월)"는 회의 날짜가 아닙니다.

## 원칙

1. 추측하지 않습니다. 본문에 없으면 null을 넣습니다.
   담당자가 안 정해진 안건에 그럴듯한 사람을 넣지 마십시오.
   어떤 안건을 "말한 사람"은 그 안건의 담당자가 아닙니다.

2. 날짜를 계산하지 않습니다.
   "다음 주 화요일", "이번 달 안에"는 본문 표현 그대로 옮깁니다.
   실제 날짜 변환은 시스템이 합니다.

   기한이 본문의 다른 날짜를 기준으로 하면, 그 기준 날짜를
   anchorDateRaw에 원문 그대로 옮깁니다.
   예) "만료 30일 전에 통보. 만료가 11월 2일"
       → dueDateRaw: "만료 30일 전", anchorDateRaw: "11월 2일"
   역산 결과를 직접 쓰지 마십시오. 계산은 시스템이 합니다.

3. 이름을 통합하지 않습니다.
   "김 대리", "민수씨"는 본문에 쓰인 그대로 옮깁니다.
   같은 사람인지 판단하는 것은 시스템이 합니다.
   이름 옆에 소속·부서가 적혀 있으면 assigneeContextRaw에 그대로 옮깁니다.
   같은 이름이 서로 다른 소속으로 나오면 각각 별개의 사람으로 둡니다. 합치지 마십시오.

4. 결정이 번복되면 최종 상태를 남기고, 뒤집힌 쪽 문장을 supersededQuote에 인용합니다.
   앞에서 정했다가 뒤에서 뒤집혔다면 결론은 뒤집힌 쪽이며,
   앞에서 정했던 문장은 지우지 말고 supersededQuote에 원문 그대로 남깁니다.

5. 선행조건이 있으면 그 표현을 blockedByRaw에 그대로 옮깁니다.
   다른 일이 끝나거나 어떤 사건이 일어나야 시작되는 경우입니다.
   예) "업체 확정된 뒤에", "예산 나오면", "담당자가 휴가에서 돌아오면"
   이것은 기한이 아닙니다. dueDateRaw에 넣지 마십시오.
   판단이 서지 않으면 blockedByRaw 쪽에 넣습니다.

6. 담당자는 한 발화 안에서 확정된 경우에만 적습니다.
   - "제가 물어볼게요" → 그 발화의 화자가 담당자입니다.
   - "A 씨가 해주세요" → A가 담당자입니다.
   - 지시와 수락이 서로 다른 발화에 나뉘어 있으면 (예: "뽑아주세요" →
     "제가요?" → "네 수현 씨가") 담당자를 null로 두고 no_assignee를 넣습니다.
     여러 발화를 이어 붙여 추론하지 마십시오. 시스템이 사용자에게 되묻습니다.

7. 모든 항목에 근거 문장을 원문에서 그대로 인용합니다.
   한 글자도 바꾸지 마십시오. 요약하거나 다듬지 마십시오.
   인용은 한 문장(또는 한 발화)입니다. 여러 줄을 이어 붙이지 마십시오.

## 분류

- decision : 확정된 결정. 번복·보류된 것은 제외
- action   : 누군가 해야 할 일
- open     : 논의했으나 결론이 나지 않은 것 (번복되어 원점이 된 것 포함)

## 제외 대상

- 잡담, 주제에서 벗어난 대화
- 이미 완료된 일의 확인
- 다음 회의 일정 자체
- 회의 중 취소·철회된 안건

## 검토 사유 (reviewReasons)

해당하는 것을 모두 배열에 넣습니다. 해당 없으면 빈 배열입니다.
사유를 문장으로 쓰지 마십시오. 아래 코드값만 사용합니다.

- no_assignee      : 담당자가 없거나 "팀 전체"처럼 개인이 아님.
                     여러 발화에 걸쳐야 담당자를 알 수 있는 경우도 포함
- assignee_unknown : 담당자가 1인칭("내가")이거나 누구인지 본문에서 특정 불가
- duplicate_name   : 같은 이름이 서로 다른 소속으로 등장
- due_unparseable  : 기한 표현이 날짜로 환산 불가 ("여유 될 때", "다음 회의 전까지")
- unit_unclear     : 금액·수량의 단위가 불명확 ("3천")
- superseded       : 앞선 결정이 번복됨
- blocked          : 선행조건이 끝나야 시작 가능
- conditional      : 조건에 따라 결론이 갈림 ("10만원 이내면 A, 넘으면 B")
- ambiguous_intent : 결정인지 잡담인지 판단이 갈림

※ assignee_unmatched는 AI가 넣지 않습니다. 시스템이 참석자 대조 후 붙입니다.
```

## User message

```
회의 날짜: {{meetingDate}}   ← 사용자가 화면에서 **직접 고쳤을 때만** 값이 옴. 아니면 "(입력 없음)"

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
    attendeesRaw: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nameRaw", "contextRaw"],
        properties: {
          nameRaw:    { type: "string" },            // "김민수"
          contextRaw: { type: ["string", "null"] }   // "회계" / "개발팀"
        }
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type","content","assigneeRaw","assigneeContextRaw",
          "dueDateRaw","anchorDateRaw","blockedByRaw",
          "reviewReasons","quote","supersededQuote"
        ],
        properties: {
          type:              { enum: ["decision","action","open"] },
          content:           { type: "string" },
          assigneeRaw:       { type: ["string","null"] },  // "김 대리" 원문 그대로
          assigneeContextRaw:{ type: ["string","null"] },  // "회계" — 동명이인 구분용
          dueDateRaw:        { type: ["string","null"] },  // "담주 화요일" 원문 그대로
          anchorDateRaw:     { type: ["string","null"] },  // "11월 2일" — 역산 기준일
          blockedByRaw:      { type: ["string","null"] },  // "업체 확정" — 기한 아님
          reviewReasons: {
            type: "array",
            items: { enum: [
              "no_assignee","assignee_unknown","assignee_unmatched",
              "duplicate_name","due_unparseable","unit_unclear",
              "superseded","blocked","conditional","ambiguous_intent"
            ]}
          },
          quote:             { type: "string" },           // 원문 인용 (한 문장)
          supersededQuote:   { type: ["string","null"] }   // 뒤집힌 결정의 원문
        }
      }
    }
  }
}
```

### 변경 이력

**4차 — 기준일 버그 수정 후 (2026-09-14)**

- **0단계 `meetingDateRaw` 지시 추가** — 스키마에는 있는데 프롬프트에 채우라는 말이 없어서
  AI가 계속 null을 냈습니다. 원문에 `2026-09-08 (월)`이 버젓이 적힌 샘플 01도 null.
  스키마에 필드를 넣는 것과 채우라고 시키는 것은 다른 일입니다
- User message에 오늘 날짜를 "회의 날짜"로 넘기지 않음 — AI가 그걸 `meetingDateRaw`로 베낌

**1차 — 샘플 02 대조 후**

- `confidence` 삭제 — `reviewReasons`가 비었으면 high, 아니면 needs_review. 코드가 파생
- `reviewReason`(자유 문장) → `reviewReasons`(enum 배열) — AI가 글을 쓰지 않음, CSV 필터 가능
- `assigneeContextRaw` 추가 — 동명이인 (샘플 02)
- `blockedByRaw` 추가 — 선행조건 (샘플 02, 05)
- `supersededQuote` 추가 — 번복 흔적 보존 (샘플 02)
- `attendeesRaw` 구조화 — 참석자 단계에서 동명이인 식별

**2차 — 샘플 01~05 회귀 확인 후**

- `assignee_unmatched` enum 추가 — 참석자 목록에 없는 이름이 담당자로 나올 때
  (샘플 01 "김 대리", 샘플 03 "팀장님"). 코드가 대조 실패 시 붙임
- 원칙 5 범위 확대 — "다른 일" → "다른 일 또는 사건". 판단 모호 시 blockedByRaw 우선
  (샘플 03 "휴가에서 돌아오면"이 dueDateRaw와 갈리던 문제)
- 원칙 6 신설 — 여러 발화에 걸친 담당자 확정은 추론하지 않고 비움 + no_assignee
  (샘플 04 "제가요?" → "네 수현 씨가"). `quote`는 단일 문장 유지
- 원칙 1에 한 줄 추가 — 안건을 말한 사람 ≠ 담당자 (샘플 01 "민수씨가 말한 근태 오류")
- `anchorDateRaw` 추가 — 역산 기준일 (샘플 05 커피머신 만료 11/2 → 통보 10/3)

**3차 — 2차 회귀 확인 후 (코드 쪽만, 스키마 변경 없음)**

- 참석자 후보 제안 규칙 추가 — 후보 1명일 때만 미리 선택 (샘플 01 편의 / 샘플 02 안전장치)
- `00_함정_정답지.md` 동기화 — 04번 기대동작을 "담당자 비움 + 되묻기"로 수정

추가 필드는 모두 **발췌형**입니다. AI가 판단하는 칸은 `type`과 `reviewReasons` 둘뿐이고,
둘 다 정해진 값 중 고르는 것이라 코드가 검증할 수 있습니다.
`dueType` 같은 판단 enum을 만들지 않은 이유도 같습니다 — `blockedByRaw`가 null이 아니면
코드가 선행조건으로 처리하면 됩니다.

### 의도적으로 하지 않은 것

**`quote`를 배열로 만들지 않았습니다.**
샘플 04처럼 전사본에서 담당자가 여러 발화에 걸쳐 확정되는 경우
(`"뽑아주세요"` → `"제가요?"` → `"네 수현 씨가"`), 근거를 대려면 세 줄을 인용해야 합니다.
`quote`를 배열로 바꾸면 환각 탐지 코드가 전부 배열 순회로 바뀌고,
"인용문 하나가 원문에 있는가"라는 단순한 검사가 복잡해집니다.

대신 **담당자를 비우고 `no_assignee`로 내보냅니다.**
자동 추출의 한계를 감추지 않고 사용자에게 되묻는 쪽을 택했습니다.
추론해서 채워 넣으면 틀려도 티가 안 나지만, 비워두면 화면에 드러납니다.

---

## 코드가 맡는 부분 (AI 아님)

| 작업 | 방법 |
|---|---|
| **기준일 결정** | `resolveMeetingDate(userDate, meetingDateRaw, fallbackDate)`. 우선순위 **사용자 지정 > 원문 > 오늘**. 어느 쪽을 썼는지 `meetingDateSource`로 내보냄 |
| `meetingDateRaw` → 실제 날짜 | `parseAbsolute`. AI는 발췌만 하고 환산은 코드가 함 |
| `dueDateRaw` → 실제 날짜 | `parseDue(dueDateRaw, anchorDateRaw ?? meetingDate)`. 실패하면 `due_unparseable` 승격 |
| 역산 (만료 11/2 → 통보 10/3) | 위와 같은 파서. `anchorDateRaw` + "N일 전" 패턴 |
| `assigneeRaw` → 인물 통합 | `attendeesRaw`와 대조. `contextRaw`가 다르면 별개 인물로 유지 |
| 참석자 대조 실패 | 매칭되는 참석자가 없으면 `assignee_unmatched` 승격 |
| **후보 제안** | 대조 실패 시 성씨·이름 부분일치로 후보를 찾음. **후보가 정확히 1명일 때만** 되묻기 창에 미리 선택해 띄움. 2명 이상이면 후보만 나열하고 아무것도 선택하지 않음 |
| 동명이인 탐지 | `attendeesRaw`에 같은 `nameRaw`가 2개 이상 → 해당 이름 쓰는 항목 전부 `duplicate_name` |
| `quote`가 원문에 실제 존재하는지 | 문자열 포함 검사 — **환각 탐지** |
| `supersededQuote`가 원문에 실제 존재하는지 | 같은 검사 — 번복을 지어내면 걸림 |
| `confidence` 파생 | `reviewReasons.length === 0` → high |

`quote` 검사가 핵심입니다. 인용문이 원문에 없으면 AI가 지어낸 것이므로
그 항목 자체를 신뢰할 수 없습니다. `supersededQuote`도 같은 검사를 그대로 통과해야 하므로,
번복 처리는 **자기검증됩니다**.

---

## 화면 처리 (reviewReasons → UX)

| 사유 | 처리 |
|---|---|
| `no_assignee`, `assignee_unknown`, `unit_unclear` | **되묻기** — 저장 전 사용자에게 값을 요청 |
| `assignee_unmatched` | **되묻기** — 참석자 목록에서 선택. 후보 1명이면 미리 선택된 상태로 표시 |
| `duplicate_name` | **되묻기** — 후보를 나열하되 **미리 선택하지 않음** |
| `due_unparseable`, `blocked`, `conditional`, `ambiguous_intent` | **노란 배지** — 확인만 요청, 저장 가능 |
| `superseded` | **취소선** — `supersededQuote`를 원문으로 함께 표시 |

"확인해라"와 "답을 달라"는 다른 동작입니다. 별도 `needsClarification` 필드를 두지 않고
코드가 위 표로 갈라냅니다.

### 후보 제안 규칙 — 같은 코드, 반대 동작

| 상황 | 동작 |
|---|---|
| 샘플 01 — `"김 대리"`, 참석자 중 김씨 **1명**(김민수) | 김민수를 **미리 선택**해 띄움. 클릭 한 번으로 확정 |
| 샘플 02 — `"김민수"`, 참석자 중 김민수 **2명**(회계/개발팀) | 후보 2개를 띄우고 **아무것도 선택하지 않음** |

같은 규칙이 01에서는 편의로, 02에서는 안전장치로 작동합니다.
후보가 유일할 때만 제안하고, 애매하면 사람이 고릅니다.
자동으로 확정하는 경우는 없습니다.
