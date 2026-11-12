// 덱 id → 이름 변환 (순수 함수)
import type { Deck, ID } from '../db/schema'

/** 덱 목록으로 이름 조회 함수를 만든다. 없는 덱(또는 null)은 fallback 을 돌려준다 */
export function deckNamer(decks: Deck[], fallback = '모름'): (id: ID | null) => string {
  const names = new Map(decks.map((d) => [d.id, d.name]))
  return (id) => (id ? names.get(id) : undefined) ?? fallback
}
