/**
 * 회귀 측정 실행기.
 *
 * 더미 회의록 01~05를 배포된 /api/extract에 넣고, 응답 원본을 파일로 남깁니다.
 * **채점은 하지 않습니다.** 정답지 대조는 사람이 합니다 — 무엇을 항목으로 볼
 * 것인가가 이 프로젝트에서 제일 자주 틀리는 부분이고, 그건 기계가 못 셉니다.
 *
 *   node scripts/regression.mjs
 *   node scripts/regression.mjs --base http://localhost:3000   # vercel dev
 *
 * 결과: regression/runs/<날짜-시각>/01.json ~ 05.json
 *       같은 폴더에 summary.md — 화면에 찍히는 요약과 같은 내용
 *
 * 주의: 실행할 때마다 OpenAI 토큰이 나갑니다. 5건이면 5회입니다.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_DIR = join(ROOT, 'regression', 'inputs')
const RUNS_DIR = join(ROOT, 'regression', 'runs')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const BASE = arg('base', 'https://minutes-to-actions-alpha.vercel.app')
// 고정 날짜입니다. 오늘 날짜를 쓰면 회차끼리 비교가 안 됩니다 —
// "이번 주 안에"가 실행한 날에 따라 다른 값으로 환산되기 때문입니다.
const FALLBACK_DATE = arg('date', '2026-09-14')
const KEY = process.env.EXTRACT_SHARED_KEY ?? ''

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2')
const outDir = join(RUNS_DIR, stamp)

const samples = (await readdir(INPUT_DIR))
  .filter((f) => /^0[1-5]_.*\.(txt|md)$/.test(f))
  .sort()

if (samples.length === 0) {
  console.error(`더미 회의록을 못 찾았습니다: ${INPUT_DIR}`)
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
console.log(`${BASE}  기준일 없을 때 ${FALLBACK_DATE}  →  ${outDir}\n`)

const lines = []
const say = (s) => {
  console.log(s)
  lines.push(s)
}

for (const file of samples) {
  const n = file.slice(0, 2)
  const text = await readFile(join(INPUT_DIR, file), 'utf8')

  const started = Date.now()
  let res
  try {
    res = await fetch(`${BASE}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(KEY ? { 'x-extract-key': KEY } : {}) },
      body: JSON.stringify({ text, meetingDate: null, fallbackDate: FALLBACK_DATE }),
    })
  } catch (e) {
    say(`${n}  ✗ 연결 실패 — ${e.message}`)
    continue
  }

  const body = await res.json().catch(() => null)
  const took = ((Date.now() - started) / 1000).toFixed(1)

  if (!res.ok || body === null) {
    say(`${n}  ✗ HTTP ${res.status} — ${body?.error ?? '응답 없음'}`)
    continue
  }

  await writeFile(join(outDir, `${n}.json`), JSON.stringify(body, null, 2) + '\n', 'utf8')

  // 배포본이 구버전이면 여기서 드러납니다. 이 칸들이 없으면 배포부터 하십시오.
  const missing = ['meetingDateSource', 'meetingTimeRaw', 'meetingPlaceRaw', 'purposeRaw', 'agendas']
    .filter((k) => !(k in body))
  if (missing.length) say(`${n}  ⚠ 구버전 배포입니다 — 응답에 없는 칸: ${missing.join(', ')}`)
  // discussionSummary는 4.5에서 없앤 칸입니다. 있으면 4.5 이전 배포입니다.
  if ('discussionSummary' in body) say(`${n}  ⚠ 구버전 배포입니다 — discussionSummary는 4.5에서 없앤 칸입니다`)

  const agendas = body.agendas ?? []
  const items = body.items ?? []
  const byType = (t) => items.filter((i) => i.type === t).length
  const needsReview = items.filter((i) => i.confidence === 'needs_review').length

  say(`${n}  ${took}s`)
  say(`    기준일   ${body.meetingDate ?? '없음'} (${body.meetingDateSource}) / 원문 "${body.meetingDateRaw ?? '—'}"`)
  say(`    TPO      시각 "${body.meetingTimeRaw ?? '—'}" · 장소 "${body.meetingPlaceRaw ?? '—'}" · 목적 "${body.purposeRaw ?? '—'}"`)
  // 정답지의 «안건 수»·«안건 묶음»을 손으로 채점할 때 이 줄만 보면 됩니다
  say(`    안건     ${agendas.length}개`)
  for (const a of agendas) {
    const count = items.filter((i) => i.agendaId === a.id).length
    say(`      · ${a.title} — 항목 ${count}개${a.summary ? ` · 요약 ${a.summary.length}자` : ' · 요약 없음(null)'}`)
  }
  say(`    항목     ${items.length}개 — 결정 ${byType('decision')} / 할일 ${byType('action')} / 미결 ${byType('open')}`)
  say(`    검토필요 ${needsReview}개 · 환각탈락 ${(body.rejected ?? []).length}개`)
  say('')
}

await writeFile(join(outDir, 'summary.md'), `# 실행 요약 ${stamp}\n\n\`\`\`\n${lines.join('\n')}\`\`\`\n`, 'utf8')
console.log(`원본 응답과 요약이 ${outDir} 에 있습니다.`)
console.log('채점은 regression/answer-key.md와 대조해서 손으로 하십시오.')
