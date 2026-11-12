import { describe, expect, it } from 'vitest'
import { makeDeck, makeMatch } from '../test/fixtures'
import { deckNamer } from './deckName'
import { rankOpponentDecks } from './deckRanking'

describe('rankOpponentDecks', () => {
  const decks = [
    makeDeck({ id: 'a', name: 'A', updatedAt: 1 }),
    makeDeck({ id: 'b', name: 'B', updatedAt: 2 }),
    makeDeck({ id: 'c', name: 'C', updatedAt: 3 }),
    makeDeck({ id: 'mine', name: '내 덱', isMine: true, updatedAt: 9 }),
    makeDeck({ id: 'gone', name: '숨김', archived: true, updatedAt: 10 }),
  ]

  it('최근 많이 만난 덱이 앞에 오고, 같으면 더 최근에 만난 덱이 앞', () => {
    const matches = [
      makeMatch({ oppDeckId: 'a', createdAt: 1 }),
      makeMatch({ oppDeckId: 'b', createdAt: 2 }),
      makeMatch({ oppDeckId: 'b', createdAt: 3 }),
      makeMatch({ oppDeckId: 'c', createdAt: 4 }),
    ]
    expect(rankOpponentDecks(decks, matches).map((d) => d.id).slice(0, 3)).toEqual(['b', 'c', 'a'])
  })

  it('숨긴 덱은 빼고, 남는 자리는 상대 덱 → 내 덱 순으로 채운다', () => {
    const ids = rankOpponentDecks(decks, [makeMatch({ oppDeckId: 'gone' })]).map((d) => d.id)
    expect(ids).not.toContain('gone')
    expect(ids).toEqual(['c', 'b', 'a', 'mine'])
  })

  it('최근 N경기만 보고, 개수 제한을 지킨다', () => {
    const matches = [
      ...Array.from({ length: 3 }, (_, i) => makeMatch({ oppDeckId: 'a', createdAt: i })),
      makeMatch({ oppDeckId: 'b', createdAt: 100 }),
    ]
    // 최근 1경기만 보면 b 가 1위
    expect(rankOpponentDecks(decks, matches, 2, 1).map((d) => d.id)).toEqual(['b', 'c'])
  })
})

describe('deckNamer', () => {
  it('없는 덱과 null 은 fallback 으로 표시한다', () => {
    const name = deckNamer([makeDeck({ id: 'a', name: 'A' })], '모름')
    expect(name('a')).toBe('A')
    expect(name('x')).toBe('모름')
    expect(name(null)).toBe('모름')
  })
})
