// 상대 덱 빠른 선택에 띄울 순서 (순수 함수)
import type { Deck, ID, Match } from '../db/schema'

/**
 * 최근 경기에서 많이 만난 덱을 앞에 둔다.
 * 자리가 남으면 최근에 등록·수정한 덱으로 채운다 (상대 덱 우선).
 */
export function rankOpponentDecks(decks: Deck[], matches: Match[], limit = 8, recent = 50): Deck[] {
  const active = decks.filter((d) => !d.archived)
  const byId = new Map(active.map((d) => [d.id, d]))

  const latest = [...matches].sort((a, b) => b.createdAt - a.createdAt).slice(0, recent)
  const score = new Map<ID, { count: number; last: number }>()
  for (const m of latest) {
    if (!m.oppDeckId || !byId.has(m.oppDeckId)) continue
    const s = score.get(m.oppDeckId) ?? { count: 0, last: 0 }
    s.count++
    s.last = Math.max(s.last, m.createdAt)
    score.set(m.oppDeckId, s)
  }

  const met = [...score.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
    .map(([id]) => byId.get(id)!)

  const rest = active
    .filter((d) => !score.has(d.id))
    .sort((a, b) => Number(a.isMine) - Number(b.isMine) || b.updatedAt - a.updatedAt)

  return [...met, ...rest].slice(0, limit)
}
