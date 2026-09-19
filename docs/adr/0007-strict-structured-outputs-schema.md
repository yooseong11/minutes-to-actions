# 0007. 응답은 strict Structured Outputs 스키마로 강제한다

## 결정
OpenAI Responses API의 strict Structured Outputs를 쓰고, JSON Schema는 `lib/extraction-config.ts` 한 곳에 둔다.

## 이유
자유 형식 파싱을 없애 모양이 어긋난 응답을 애초에 받지 않는다. 내용의 진실성은 별도로 검증한다(0005).

## 버린 대안
- 프롬프트로 JSON을 부탁하고 파싱: 깨진 응답을 매번 방어해야 한다.
- 스키마를 호출부에 인라인: 프론트 타입과 어긋나도 알아챌 곳이 없다.
