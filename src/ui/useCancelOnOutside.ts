import { useEffect, useRef } from 'react'

/**
 * 편집 영역 바깥을 누르면 취소. 안건 · TPO · 참석자가 같이 씁니다.
 *
 * click이 아니라 pointerdown으로 잡습니다 — 저장 버튼을 누를 때 pointerdown이
 * 먼저 오는데, 그 target은 폼 안이라 취소로 새지 않습니다.
 */
export default function useCancelOnOutside(editing: boolean, stop: () => void) {
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!editing) return
    const cancelOutside = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) stop()
    }
    document.addEventListener('pointerdown', cancelOutside)
    return () => document.removeEventListener('pointerdown', cancelOutside)
  }, [editing, stop])
  return formRef
}
