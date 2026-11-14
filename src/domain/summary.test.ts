import { describe, expect, it } from 'vitest'
import { makeEvent, makeMatch } from '../test/fixtures'
import {
  defaultFormat,
  matchLabel,
  nextAction,
  shareText,
  sortMatches,
  summarizeEvent,
  tallyRecord,
} from './summary'

const swiss = (round: number, over = {}) => makeMatch({ stage: 'swiss', round, ...over })

describe('sortMatches', () => {
  it('예선은 기록 순, 본선은 단계 순으로 예선 뒤에 둔다', () => {
    const final = makeMatch({ stage: 'final', seq: 1 })
    const r2 = makeMatch({ stage: 'swiss', seq: 3 })
    const semi = makeMatch({ stage: 'semi', seq: 2 })
    const r1 = makeMatch({ stage: 'swiss', seq: 4 })
    expect(sortMatches([final, r2, semi, r1]).map((m) => m.id)).toEqual([
      r2.id,
      r1.id,
      semi.id,
      final.id,
    ])
  })
})

describe('matchLabel', () => {
  it('예선은 R 번호, 본선은 단계 이름, 단독 기록은 "단독"', () => {
    expect(matchLabel(swiss(3))).toBe('R3')
    expect(matchLabel(makeMatch({ stage: 'semi' }))).toBe('4강')
    expect(matchLabel(makeMatch({ eventId: null, round: null }))).toBe('단독')
  })
})

describe('tallyRecord', () => {
  it('대회 전적에서는 부전승을 승으로 센다', () => {
    const t = tallyRecord([
      swiss(1, { result: 'bye' }),
      swiss(2, { result: 'loss' }),
      swiss(3, { result: 'draw' }),
    ])
    expect(t).toEqual({ win: 1, loss: 1, draw: 1 })
  })
})

describe('summarizeEvent', () => {
  it('본선이 없으면 topLabel 이 없다', () => {
    expect(summarizeEvent([swiss(1)]).topLabel).toBeNull()
  })

  it.each([
    ['final', 'win', '우승'],
    ['final', 'loss', '준우승'],
    ['semi', 'loss', '4강'],
    ['semi', 'win', '4강 승'],
    ['top8', 'bye', '8강 승'],
  ] as const)('%s %s → %s', (stage, result, label) => {
    const s = summarizeEvent([swiss(1), swiss(2, { result: 'loss' }), makeMatch({ stage, result })])
    expect(s.topLabel).toBe(label)
    expect(s.swiss).toEqual({ win: 1, loss: 1, draw: 0 })
  })
})

describe('nextAction', () => {
  it('본선 기록이 없으면 다음 예선 라운드', () => {
    expect(nextAction([])).toEqual({ stage: 'swiss', label: 'R1' })
    expect(nextAction([swiss(1), swiss(2)])).toEqual({ stage: 'swiss', label: 'R3' })
  })

  it('본선에서 이기면 다음 단계', () => {
    expect(nextAction([swiss(1), makeMatch({ stage: 'top8', result: 'win' })])).toEqual({
      stage: 'semi',
      label: '4강',
    })
  })

  it('직접 종료한 대회는 다음 라운드를 제안하지 않는다 (스위스만으로 끝난 대회)', () => {
    expect(nextAction([swiss(1), swiss(2)], true)).toBeNull()
    expect(nextAction([swiss(1), makeMatch({ stage: 'top8', result: 'win' })], true)).toBeNull()
  })

  it('본선에서 지거나 결승까지 끝나면 null', () => {
    expect(nextAction([makeMatch({ stage: 'semi', result: 'loss' })])).toBeNull()
    expect(nextAction([makeMatch({ stage: 'final', result: 'win' })])).toBeNull()
  })
})

describe('defaultFormat', () => {
  it('예선은 단판이 기본이고, 직전 예선 형식을 따른다', () => {
    expect(defaultFormat('swiss', [])).toBe('bo1')
    expect(defaultFormat('swiss', [swiss(1, { matchFormat: 'bo3' })])).toBe('bo3')
  })

  it('본선은 4강·결승만 Bo3 가 기본', () => {
    expect(defaultFormat('top16', [])).toBe('bo1')
    expect(defaultFormat('top8', [])).toBe('bo1')
    expect(defaultFormat('semi', [])).toBe('bo3')
    expect(defaultFormat('final', [])).toBe('bo3')
  })

  it('직전 본선이 Bo3 였으면 이후 본선도 Bo3 (8강부터 Bo3 인 대회)', () => {
    const top8 = makeMatch({ stage: 'top8', matchFormat: 'bo3' })
    expect(defaultFormat('semi', [top8])).toBe('bo3')
    const top16 = makeMatch({ stage: 'top16', matchFormat: 'bo3' })
    expect(defaultFormat('top8', [top16])).toBe('bo3')
  })

  it('예선이 Bo3 여도 본선 기본값에는 영향이 없다', () => {
    expect(defaultFormat('top8', [swiss(1, { matchFormat: 'bo3' })])).toBe('bo1')
  })
})

describe('shareText', () => {
  it('대회 정보, 전적, 라운드별 결과를 줄마다 적는다', () => {
    const names: Record<string, string> = { mine: '임페리얼드라몬', omega: '오메가몬' }
    const text = shareText(
      makeEvent({ store: '○○샵', format: 'BT23', finalRank: 2, participants: 16 }),
      [
        makeMatch({ stage: 'semi', matchFormat: 'bo3', result: 'loss', oppDeckId: 'omega' }),
        swiss(1, { result: 'win', turnOrder: 'first', oppDeckId: 'omega' }),
        swiss(2, { result: 'bye', oppDeckId: null, turnOrder: null }),
      ],
      (id) => (id && names[id]) || '모름',
    )
    expect(text).toBe(
      [
        '매장대회 2026-11-12 @○○샵 (BT23)',
        '덱: 임페리얼드라몬 / 2-1 (2위/16명)',
        'R1 vs 오메가몬 선 ○',
        'R2 부전승 ○',
        '4강 vs 오메가몬 Bo3 ×',
      ].join('\n'),
    )
  })

  it('매장·포맷·순위가 없으면 생략한다', () => {
    const text = shareText(makeEvent(), [swiss(1, { turnOrder: 'second' })], () => '덱')
    expect(text.split('\n').slice(0, 3)).toEqual(['매장대회 2026-11-12', '덱: 덱 / 1-0', 'R1 vs 덱 후 ○'])
  })

  it('선후공을 모르면 그 자리를 비운다', () => {
    const text = shareText(makeEvent(), [makeMatch({ stage: 'final', turnOrder: null, result: 'loss' })], () => '덱')
    expect(text.split('\n')[2]).toBe('결승 vs 덱 ×')
  })
})
