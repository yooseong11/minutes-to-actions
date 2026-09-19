import type { ReactNode } from 'react'

/**
 * 문서의 한 칸. 제목 · 개수 · 부제만 그립니다.
 *
 * 회의 도메인을 모르는 껍데기라 `meeting/`이 아니라 여기 있습니다 —
 * 참석자 · TPO · 안건이 모두 이 틀을 씁니다.
 */
export default function Section({
  title,
  note,
  count,
  children,
}: {
  title: string
  note: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className="doc-section">
      <h2 className="doc-title">
        {title}
        {count !== undefined && <span className="doc-count">{count}</span>}
        <span className="doc-note">{note}</span>
      </h2>
      {children}
    </section>
  )
}
