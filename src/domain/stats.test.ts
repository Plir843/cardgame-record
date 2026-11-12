import { describe, expect, it } from 'vitest'
import { makeMatch } from '../test/fixtures'
import { computeStats, UNKNOWN_DECK } from './stats'

describe('computeStats', () => {
  it('부전승은 모든 통계에서 제외한다', () => {
    const s = computeStats([
      makeMatch({ result: 'win' }),
      makeMatch({ result: 'bye', oppDeckId: null, turnOrder: null }),
    ])
    expect(s.overall).toEqual({ win: 1, loss: 0, draw: 0 })
    expect(s.byOpp.has(UNKNOWN_DECK)).toBe(false)
    expect(s.byMyDeck.get('mine')).toEqual({ win: 1, loss: 0, draw: 0 })
  })

  it('무승부는 판수에 포함한다', () => {
    const s = computeStats([makeMatch({ result: 'win' }), makeMatch({ result: 'draw' })])
    expect(s.overall).toEqual({ win: 1, loss: 0, draw: 1 })
  })

  it('선공/후공 승률은 단판만 집계하고 Bo3 는 따로 센다', () => {
    const s = computeStats([
      makeMatch({ turnOrder: 'first', result: 'win' }),
      makeMatch({ turnOrder: 'second', result: 'loss' }),
      makeMatch({ turnOrder: 'first', result: 'loss', matchFormat: 'bo3' }),
      makeMatch({ turnOrder: 'second', result: 'win', matchFormat: 'bo3' }),
    ])
    expect(s.first).toEqual({ win: 1, loss: 0, draw: 0 })
    expect(s.second).toEqual({ win: 0, loss: 1, draw: 0 })
    expect(s.bo3).toEqual({ win: 1, loss: 1, draw: 0 })
    // 덱별·상성 통계에는 Bo3 도 1판으로 들어간다
    expect(s.overall).toEqual({ win: 2, loss: 2, draw: 0 })
  })

  it('상대 덱을 모르면 UNKNOWN_DECK 으로 묶는다', () => {
    const s = computeStats([
      makeMatch({ oppDeckId: 'omega', result: 'loss' }),
      makeMatch({ oppDeckId: 'omega', result: 'win' }),
      makeMatch({ oppDeckId: null, result: 'win' }),
    ])
    expect(s.byOpp.get('omega')).toEqual({ win: 1, loss: 1, draw: 0 })
    expect(s.byOpp.get(UNKNOWN_DECK)).toEqual({ win: 1, loss: 0, draw: 0 })
  })

  it('내 덱 필터는 나머지 통계만 좁히고 내 덱별 승률은 그대로 둔다', () => {
    const s = computeStats(
      [
        makeMatch({ myDeckId: 'a', result: 'win' }),
        makeMatch({ myDeckId: 'b', result: 'loss' }),
      ],
      { myDeckId: 'a' },
    )
    expect(s.overall).toEqual({ win: 1, loss: 0, draw: 0 })
    expect(s.byMyDeck.size).toBe(2)
  })

  it('기간과 포맷으로 거를 수 있다 (2차 필터 대비)', () => {
    const list = [
      makeMatch({ date: '2026-10-01', format: 'BT22' }),
      makeMatch({ date: '2026-11-01', format: 'BT23' }),
      makeMatch({ date: '2026-12-01', format: 'BT23' }),
    ]
    expect(totalGames(computeStats(list, { from: '2026-11-01' }))).toBe(2)
    expect(totalGames(computeStats(list, { to: '2026-11-01' }))).toBe(2)
    expect(totalGames(computeStats(list, { format: 'BT22' }))).toBe(1)
  })

  it('패배 원인은 패배 수 대비로 센다', () => {
    const s = computeStats([
      makeMatch({ result: 'loss', lossTagIds: ['brick', 'misplay'] }),
      makeMatch({ result: 'loss', lossTagIds: ['brick'] }),
      makeMatch({ result: 'loss' }),
      makeMatch({ result: 'win' }),
    ])
    expect(s.lossCount).toBe(3)
    expect(s.lossTags.get('brick')).toBe(2)
    expect(s.lossTags.get('misplay')).toBe(1)
  })
})

const totalGames = (s: ReturnType<typeof computeStats>) =>
  s.overall.win + s.overall.loss + s.overall.draw
