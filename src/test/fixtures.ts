// 테스트용 데이터 생성 도우미 (앱 번들에는 포함되지 않는다)
import type { Deck, EventRecord, Match } from '../db/schema'

let counter = 0

/** 기본값을 채운 경기 기록. 필요한 값만 덮어쓴다 */
export function makeMatch(over: Partial<Match> = {}): Match {
  counter++
  return {
    id: `m${counter}`,
    eventId: 'e1',
    stage: 'swiss',
    round: null,
    matchFormat: 'bo1',
    seq: counter,
    date: '2026-11-12',
    format: 'BT23',
    myDeckId: 'mine',
    oppDeckId: 'opp',
    turnOrder: 'first',
    result: 'win',
    lossTagIds: [],
    memo: '',
    createdAt: counter,
    updatedAt: counter,
    ...over,
  }
}

export function makeDeck(over: Partial<Deck> & Pick<Deck, 'id' | 'name'>): Deck {
  return { isMine: false, archived: false, createdAt: 0, updatedAt: 0, ...over }
}

export function makeEvent(over: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    name: '매장대회',
    date: '2026-11-12',
    store: '',
    format: '',
    myDeckId: 'mine',
    finalRank: null,
    participants: null,
    closed: false,
    memo: '',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }
}
