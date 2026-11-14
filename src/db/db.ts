import Dexie, { type Table } from 'dexie'
import {
  DEFAULT_LOSS_TAGS,
  type Deck,
  type EventRecord,
  type ID,
  type LossTag,
  type Match,
  type Setting,
} from './schema'

// DB 이름은 앱 이름이 바뀌어도 그대로 둔다 (바꾸면 기존 기록이 담긴 DB 를 찾지 못한다)
export const db = new Dexie('digimon-record') as Dexie & {
  decks: Table<Deck, ID>
  events: Table<EventRecord, ID>
  matches: Table<Match, ID>
  lossTags: Table<LossTag, ID>
  settings: Table<Setting, string>
}

// 스키마 v1.
// 구조를 바꿀 때는 이 정의를 고치지 말고 db.version(2).stores(...).upgrade(...) 를 아래에 추가한다.
db.version(1).stores({
  decks: 'id, name, isMine',
  events: 'id, date, myDeckId',
  matches: 'id, eventId, date, myDeckId, oppDeckId, [eventId+seq]',
  lossTags: 'id',
  settings: 'key',
})

// 스키마 v2: 대회에 종료 여부(closed) 추가. 인덱스는 그대로이고 기존 대회는 false 로 채운다.
db.version(2)
  .stores({})
  .upgrade((tx) =>
    tx
      .table<EventRecord>('events')
      .toCollection()
      .modify((e) => {
        e.closed ??= false
      }),
  )

// 최초 실행 시 기본 패배 원인 태그를 넣는다
db.on('populate', (tx) => {
  void tx.table('lossTags').bulkAdd(DEFAULT_LOSS_TAGS)
})
