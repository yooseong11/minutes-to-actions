/**
 * 아이콘. 글리프 문자(✎ ×)는 폰트에 따라 클립이나 곱셈기호로 보입니다.
 * 줄 오른쪽 끝의 작은 표식이라 모양이 흔들리면 무슨 버튼인지 알 수 없습니다.
 * currentColor를 쓰므로 다크 모드에서 색이 따라옵니다.
 */
export default function Icon({ path }: { path: string }) {
  return (
    <svg className="icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
