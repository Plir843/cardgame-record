// 통계 집계 (순수 함수)
// 규칙
// - 부전승은 모든 통계에서 제외한다.
// - 무승부는 판수에 포함하고 승으로 세지 않는다.
// - 덱별 승률·상성은 단판/Bo3 구분 없이 매치 1개를 1판으로 센다.
// - 선공/후공 승률은 단판만 집계한다 (Bo3 는 1게임 선후공이 매치 승패를 결정하지 않는다).
import type { ID, Match } from '../db/schema'
import { emptyTally, type Tally } from './tally'

/** 2차에서 기간/포맷 필터 UI 를 붙일 수 있게 처음부터 인자로 받는다 */
export interface StatsFilter {
  myDeckId?: ID
  /** 'YYYY-MM-DD' 이상 */
  from?: string
  /** 'YYYY-MM-DD' 이하 */
  to?: string
  format?: string
}

export const UNKNOWN_DECK = 'unknown'

export interface Stats {
  overall: Tally
  /** 내 덱별 승률 (myDeckId 필터와 무관하게 전체 덱을 보여준다) */
  byMyDeck: Map<ID, Tally>
  /** 상대 덱별 상성. 모르는 덱은 UNKNOWN_DECK 키 */
  byOpp: Map<string, Tally>
  first: Tally
  second: Tally
  bo3: Tally
  /** 패배 원인 태그별 횟수 */
  lossTags: Map<ID, number>
  /** 패배 수 (태그 비율의 분모) */
  lossCount: number
}

function add(t: Tally, m: Match) {
  if (m.result === 'win') t.win++
  else if (m.result === 'loss') t.loss++
  else if (m.result === 'draw') t.draw++
}

function bump<K>(map: Map<K, Tally>, key: K, m: Match) {
  const t = map.get(key) ?? emptyTally()
  add(t, m)
  map.set(key, t)
}

export function computeStats(matches: Match[], filter: StatsFilter = {}): Stats {
  const inRange = matches.filter(
    (m) =>
      m.result !== 'bye' &&
      (!filter.from || m.date >= filter.from) &&
      (!filter.to || m.date <= filter.to) &&
      (!filter.format || m.format === filter.format),
  )

  const byMyDeck = new Map<ID, Tally>()
  for (const m of inRange) bump(byMyDeck, m.myDeckId, m)

  const scoped = filter.myDeckId ? inRange.filter((m) => m.myDeckId === filter.myDeckId) : inRange

  const stats: Stats = {
    overall: emptyTally(),
    byMyDeck,
    byOpp: new Map(),
    first: emptyTally(),
    second: emptyTally(),
    bo3: emptyTally(),
    lossTags: new Map(),
    lossCount: 0,
  }

  for (const m of scoped) {
    add(stats.overall, m)
    bump(stats.byOpp, m.oppDeckId ?? UNKNOWN_DECK, m)
    if (m.matchFormat === 'bo3') add(stats.bo3, m)
    else if (m.turnOrder === 'first') add(stats.first, m)
    else if (m.turnOrder === 'second') add(stats.second, m)
    if (m.result === 'loss') {
      stats.lossCount++
      for (const id of m.lossTagIds) stats.lossTags.set(id, (stats.lossTags.get(id) ?? 0) + 1)
    }
  }
  return stats
}
