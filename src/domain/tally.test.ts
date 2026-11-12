import { describe, expect, it } from 'vitest'
import { percentText, rateOf, recordShort, recordText } from './tally'

describe('tally', () => {
  it('무승부는 판수에 포함하고 승으로 세지 않는다', () => {
    expect(rateOf({ win: 1, loss: 2, draw: 1 })).toBe(0.25)
  })

  it('판수가 없으면 승률이 없다', () => {
    expect(rateOf({ win: 0, loss: 0, draw: 0 })).toBeNull()
    expect(percentText({ win: 0, loss: 0, draw: 0 })).toBe('-')
  })

  it('승률은 반올림한 퍼센트로 표시한다', () => {
    expect(percentText({ win: 2, loss: 1, draw: 0 })).toBe('67%')
  })

  it('무승부는 있을 때만 표시한다', () => {
    expect(recordText({ win: 3, loss: 1, draw: 0 })).toBe('3승 1패')
    expect(recordText({ win: 3, loss: 1, draw: 1 })).toBe('3승 1패 1무')
    expect(recordShort({ win: 3, loss: 1, draw: 0 })).toBe('3-1')
    expect(recordShort({ win: 3, loss: 1, draw: 2 })).toBe('3-1-2')
  })
})
