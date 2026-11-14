// 모든 쓰기 작업이 모이는 곳. 화면은 db 를 직접 건드리지 않고 이 함수들만 호출한다.
// (2차에서 클라우드 동기화를 붙일 때 이 계층만 확장하면 된다)
import { newId } from '../lib/id'
import { db } from './db'
import type {
  Deck,
  EventRecord,
  ID,
  LossTag,
  Match,
  MatchFormat,
  Result,
  Stage,
  TurnOrder,
} from './schema'

const now = () => Date.now()
const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

// ───────── 덱 ─────────

async function findDeckByName(name: string): Promise<Deck | undefined> {
  const key = clean(name).toLowerCase()
  const all = await db.decks.toArray()
  return all.find((d) => d.name.toLowerCase() === key)
}

/** 같은 이름의 덱이 있으면 그 덱을, 없으면 새로 만들어 반환한다 */
export async function ensureDeck(name: string, opts: { isMine?: boolean } = {}): Promise<Deck> {
  const cleaned = clean(name)
  if (!cleaned) throw new Error('덱 이름을 입력하세요')
  const existing = await findDeckByName(cleaned)
  if (existing) {
    const patch: Partial<Deck> = {}
    if (existing.archived) patch.archived = false
    if (opts.isMine && !existing.isMine) patch.isMine = true
    if (Object.keys(patch).length === 0) return existing
    patch.updatedAt = now()
    await db.decks.update(existing.id, patch)
    return { ...existing, ...patch }
  }
  const deck: Deck = {
    id: newId(),
    name: cleaned,
    isMine: !!opts.isMine,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.decks.add(deck)
  return deck
}

export async function renameDeck(id: ID, name: string): Promise<void> {
  const cleaned = clean(name)
  if (!cleaned) throw new Error('덱 이름을 입력하세요')
  const dup = await findDeckByName(cleaned)
  if (dup && dup.id !== id) throw new Error('같은 이름의 덱이 이미 있습니다')
  await db.decks.update(id, { name: cleaned, updatedAt: now() })
}

export async function updateDeck(
  id: ID,
  patch: Partial<Pick<Deck, 'isMine' | 'archived'>>,
): Promise<void> {
  await db.decks.update(id, { ...patch, updatedAt: now() })
}

// ───────── 대회 ─────────

export type EventInput = Pick<EventRecord, 'name' | 'date' | 'store' | 'format' | 'myDeckId'>
export type EventPatch = Partial<
  EventInput & Pick<EventRecord, 'finalRank' | 'participants' | 'memo' | 'closed'>
>

export async function createEvent(input: EventInput): Promise<EventRecord> {
  const event: EventRecord = {
    id: newId(),
    name: clean(input.name),
    date: input.date,
    store: clean(input.store),
    format: clean(input.format),
    myDeckId: input.myDeckId,
    finalRank: null,
    participants: null,
    closed: false,
    memo: '',
    createdAt: now(),
    updatedAt: now(),
  }
  await db.events.add(event)
  return event
}

/** 대회 정보를 수정한다. 날짜·포맷·사용 덱이 바뀌면 소속 라운드에도 함께 반영한다 */
export async function updateEvent(id: ID, patch: EventPatch): Promise<void> {
  const p = { ...patch }
  if (p.name !== undefined) p.name = clean(p.name)
  if (p.store !== undefined) p.store = clean(p.store)
  if (p.format !== undefined) p.format = clean(p.format)
  await db.transaction('rw', db.events, db.matches, async () => {
    const before = await db.events.get(id)
    if (!before) return
    await db.events.update(id, { ...p, updatedAt: now() })
    // 실제로 바뀐 값만 라운드에 반영한다 (바뀌지 않은 라운드의 updatedAt 을 건드리지 않게)
    const sync: Partial<Match> = {}
    if (p.date !== undefined && p.date !== before.date) sync.date = p.date
    if (p.format !== undefined && p.format !== before.format) sync.format = p.format
    if (p.myDeckId !== undefined && p.myDeckId !== before.myDeckId) sync.myDeckId = p.myDeckId
    if (Object.keys(sync).length > 0) {
      sync.updatedAt = now()
      await db.matches.where('eventId').equals(id).modify(sync)
    }
  })
}

export interface EventSnapshot {
  event: EventRecord
  matches: Match[]
}

/** 대회와 소속 라운드를 삭제하고, 되돌리기용 스냅샷을 반환한다 */
export async function deleteEvent(id: ID): Promise<EventSnapshot | null> {
  return db.transaction('rw', db.events, db.matches, async () => {
    const event = await db.events.get(id)
    if (!event) return null
    const matches = await db.matches.where('eventId').equals(id).toArray()
    await db.matches.where('eventId').equals(id).delete()
    await db.events.delete(id)
    return { event, matches }
  })
}

export async function restoreEvent(snap: EventSnapshot): Promise<void> {
  await db.transaction('rw', db.events, db.matches, async () => {
    await db.events.put(snap.event)
    await db.matches.bulkPut(snap.matches)
  })
}

// ───────── 경기(라운드) ─────────

export interface MatchInput {
  eventId: ID | null
  stage: Stage
  matchFormat: MatchFormat
  oppDeckId: ID | null
  turnOrder: TurnOrder | null
  result: Result
  lossTagIds?: ID[]
  memo?: string
  /** 단독 기록일 때만 사용 (대회 라운드는 대회 값을 복사한다) */
  date?: string
  myDeckId?: ID
  format?: string
}

/** 예선 라운드 번호를 기록 순서대로 1부터 다시 매긴다 */
async function renumberSwiss(eventId: ID): Promise<void> {
  const list = await db.matches.where('eventId').equals(eventId).sortBy('seq')
  let n = 0
  for (const m of list) {
    const round = m.stage === 'swiss' ? ++n : null
    if (m.round !== round) await db.matches.update(m.id, { round })
  }
}

export async function addMatch(input: MatchInput): Promise<Match> {
  return db.transaction('rw', db.events, db.matches, async () => {
    const base = {
      id: newId(),
      stage: input.stage,
      matchFormat: input.matchFormat,
      oppDeckId: input.oppDeckId,
      turnOrder: input.turnOrder,
      result: input.result,
      lossTagIds: input.lossTagIds ?? [],
      memo: input.memo ?? '',
      createdAt: now(),
      updatedAt: now(),
    }
    let match: Match
    if (input.eventId) {
      const event = await db.events.get(input.eventId)
      if (!event) throw new Error('대회를 찾을 수 없습니다')
      const siblings = await db.matches.where('eventId').equals(event.id).toArray()
      const seq = siblings.reduce((max, m) => Math.max(max, m.seq), 0) + 1
      match = {
        ...base,
        eventId: event.id,
        round: null,
        seq,
        date: event.date,
        format: event.format,
        myDeckId: event.myDeckId,
      }
      await db.matches.add(match)
      await renumberSwiss(event.id)
      return (await db.matches.get(match.id)) ?? match
    }
    if (!input.myDeckId || !input.date) throw new Error('내 덱과 날짜가 필요합니다')
    match = {
      ...base,
      eventId: null,
      round: null,
      seq: 0,
      date: input.date,
      format: input.format ?? '',
      myDeckId: input.myDeckId,
    }
    await db.matches.add(match)
    return match
  })
}

export type MatchPatch = Partial<
  Pick<
    Match,
    | 'stage'
    | 'matchFormat'
    | 'oppDeckId'
    | 'turnOrder'
    | 'result'
    | 'lossTagIds'
    | 'memo'
    | 'date'
    | 'myDeckId'
  >
>

export async function updateMatch(id: ID, patch: MatchPatch): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    await db.matches.update(id, { ...patch, updatedAt: now() })
    const m = await db.matches.get(id)
    if (m?.eventId && patch.stage !== undefined) await renumberSwiss(m.eventId)
  })
}

/** 경기를 삭제하고, 되돌리기용으로 삭제된 기록을 반환한다 */
export async function deleteMatch(id: ID): Promise<Match | null> {
  return db.transaction('rw', db.matches, async () => {
    const m = await db.matches.get(id)
    if (!m) return null
    await db.matches.delete(id)
    if (m.eventId) await renumberSwiss(m.eventId)
    return m
  })
}

export async function restoreMatch(m: Match): Promise<void> {
  await db.transaction('rw', db.matches, async () => {
    await db.matches.put(m)
    if (m.eventId) await renumberSwiss(m.eventId)
  })
}

// ───────── 패배 원인 태그 ─────────

export async function addLossTag(label: string): Promise<LossTag> {
  const cleaned = clean(label)
  if (!cleaned) throw new Error('태그 이름을 입력하세요')
  const all = await db.lossTags.toArray()
  const dup = all.find((t) => t.label === cleaned)
  if (dup) {
    if (dup.archived) await db.lossTags.update(dup.id, { archived: false })
    return { ...dup, archived: false }
  }
  const tag: LossTag = {
    id: newId(),
    label: cleaned,
    order: all.reduce((max, t) => Math.max(max, t.order), -1) + 1,
    archived: false,
  }
  await db.lossTags.add(tag)
  return tag
}

export async function updateLossTag(
  id: ID,
  patch: Partial<Pick<LossTag, 'label' | 'archived'>>,
): Promise<void> {
  if (patch.label !== undefined) {
    patch = { ...patch, label: clean(patch.label) }
    if (!patch.label) throw new Error('태그 이름을 입력하세요')
  }
  await db.lossTags.update(id, patch)
}

// ───────── 설정 ─────────

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
