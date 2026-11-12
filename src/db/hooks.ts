// 화면에서 쓰는 읽기 전용 실시간 쿼리. 데이터가 바뀌면 자동으로 다시 그려진다.
// 개인 기록이라 양이 적으므로 테이블 전체를 읽고 화면에서 가공한다.
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Deck, EventRecord, LossTag, Match } from './schema'

export const useDecks = (): Deck[] | undefined => useLiveQuery(() => db.decks.toArray(), [])

export const useEvents = (): EventRecord[] | undefined =>
  useLiveQuery(() => db.events.toArray(), [])

export const useMatches = (): Match[] | undefined => useLiveQuery(() => db.matches.toArray(), [])

export const useLossTags = (): LossTag[] | undefined =>
  useLiveQuery(async () => (await db.lossTags.toArray()).sort((a, b) => a.order - b.order), [])

export const useSetting = <T,>(key: string): T | undefined =>
  useLiveQuery(async () => (await db.settings.get(key))?.value as T | undefined, [key])
