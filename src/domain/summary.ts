// 대회 요약과 공유 텍스트 (순수 함수)
import {
  STAGE_LABEL,
  TOP_STAGES,
  type EventRecord,
  type ID,
  type Match,
  type MatchFormat,
  type Result,
  type Stage,
} from '../db/schema'
import { emptyTally, recordShort, type Tally } from './tally'

const stageIndex = (s: Stage) => TOP_STAGES.indexOf(s)

/** 표시 순서: 예선(기록 순) → 본선(16강 → 결승) */
export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const sa = stageIndex(a.stage)
    const sb = stageIndex(b.stage)
    if (sa !== sb) return sa - sb
    return a.seq - b.seq || a.createdAt - b.createdAt
  })
}

/** 'R3', '4강' 같은 라운드 이름 */
export function matchLabel(m: Match): string {
  if (m.stage !== 'swiss') return STAGE_LABEL[m.stage]
  return m.round ? `R${m.round}` : '단독'
}

/** 대회 전적 집계. 부전승은 승으로 센다 */
export function tallyRecord(matches: Match[]): Tally {
  const t = emptyTally()
  for (const m of matches) {
    if (m.result === 'win' || m.result === 'bye') t.win++
    else if (m.result === 'loss') t.loss++
    else t.draw++
  }
  return t
}

export interface EventSummary {
  total: Tally
  swiss: Tally
  /** 본선 결과 ('4강', '우승' 등). 본선 기록이 없으면 null */
  topLabel: string | null
}

export function summarizeEvent(matches: Match[]): EventSummary {
  const sorted = sortMatches(matches)
  const tops = sorted.filter((m) => m.stage !== 'swiss')
  const last = tops[tops.length - 1]
  let topLabel: string | null = null
  if (last) {
    const won = last.result === 'win' || last.result === 'bye'
    if (last.stage === 'final') topLabel = won ? '우승' : '준우승'
    else topLabel = won ? `${STAGE_LABEL[last.stage]} 승` : STAGE_LABEL[last.stage]
  }
  return {
    total: tallyRecord(sorted),
    swiss: tallyRecord(sorted.filter((m) => m.stage === 'swiss')),
    topLabel,
  }
}

export interface NextAction {
  stage: Stage
  label: string
}

/**
 * 다음에 기록할 라운드.
 * - 본선 기록이 없으면 다음 예선 라운드
 * - 본선에서 이겼으면 다음 단계
 * - 본선에서 졌거나 결승까지 끝났으면 null (대회 종료)
 */
export function nextAction(matches: Match[]): NextAction | null {
  const sorted = sortMatches(matches)
  const tops = sorted.filter((m) => m.stage !== 'swiss')
  if (tops.length === 0) {
    const swissCount = sorted.filter((m) => m.stage === 'swiss').length
    return { stage: 'swiss', label: `R${swissCount + 1}` }
  }
  const last = tops[tops.length - 1]
  const won = last.result === 'win' || last.result === 'bye'
  if (!won || last.stage === 'final') return null
  const next = TOP_STAGES[stageIndex(last.stage) + 1]
  return { stage: next, label: STAGE_LABEL[next] }
}

/**
 * 새 라운드의 단판/Bo3 기본값.
 * - 예선: 이 대회의 직전 예선 라운드와 같게, 없으면 단판
 * - 본선: 이 대회의 직전 본선 라운드가 Bo3 였으면 Bo3, 아니면 4강·결승만 Bo3
 */
export function defaultFormat(stage: Stage, eventMatches: Match[]): MatchFormat {
  const sorted = sortMatches(eventMatches)
  if (stage === 'swiss') {
    const swiss = sorted.filter((m) => m.stage === 'swiss')
    return swiss[swiss.length - 1]?.matchFormat ?? 'bo1'
  }
  const tops = sorted.filter((m) => m.stage !== 'swiss')
  if (tops[tops.length - 1]?.matchFormat === 'bo3') return 'bo3'
  return stage === 'semi' || stage === 'final' ? 'bo3' : 'bo1'
}

export const RESULT_MARK: Record<Result, string> = {
  win: '○',
  loss: '×',
  draw: '△',
  bye: '○',
}

/** 후기용 텍스트: 덱명, 전적, 라운드별 상대 덱 */
export function shareText(
  event: EventRecord,
  matches: Match[],
  deckName: (id: ID | null) => string,
): string {
  const sorted = sortMatches(matches)
  const total = tallyRecord(sorted)
  const head = [event.name, event.date, event.store && `@${event.store}`, event.format && `(${event.format})`]
    .filter(Boolean)
    .join(' ')
  let rank = ''
  if (event.finalRank) {
    rank = event.participants
      ? ` (${event.finalRank}위/${event.participants}명)`
      : ` (${event.finalRank}위)`
  }
  // 한 줄 형식: '결승 vs 후디에 선 ○' (라운드 → 상대 → 선후공/Bo3 → 결과)
  const lines = sorted.map((m) => {
    const label = matchLabel(m)
    const mark = RESULT_MARK[m.result]
    if (m.result === 'bye') return `${label} 부전승 ${mark}`
    const detail =
      m.matchFormat === 'bo3'
        ? 'Bo3'
        : m.turnOrder === 'first'
          ? '선'
          : m.turnOrder === 'second'
            ? '후'
            : ''
    return [label, `vs ${deckName(m.oppDeckId)}`, detail, mark].filter(Boolean).join(' ')
  })
  return [head, `덱: ${deckName(event.myDeckId)} / ${recordShort(total)}${rank}`, ...lines].join('\n')
}
