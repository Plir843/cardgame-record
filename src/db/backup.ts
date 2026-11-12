// 데이터 백업: JSON 은 내보내기/가져오기, CSV 는 내보내기 전용(엑셀 확인용)
import { matchLabel, sortMatches } from '../domain/summary'
import { db } from './db'
import { setSetting } from './repo'
import {
  RESULT_LABEL,
  SCHEMA_VERSION,
  STAGES,
  TURN_LABEL,
  type Deck,
  type EventRecord,
  type LossTag,
  type Match,
} from './schema'

const APP_ID = 'digimon-record'
export const LAST_BACKUP_KEY = 'lastBackupAt'

export interface BackupFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  decks: Deck[]
  events: EventRecord[]
  matches: Match[]
  lossTags: LossTag[]
}

export async function buildBackup(): Promise<BackupFile> {
  const [decks, events, matches, lossTags] = await Promise.all([
    db.decks.toArray(),
    db.events.toArray(),
    db.matches.toArray(),
    db.lossTags.toArray(),
  ])
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    decks,
    events,
    matches,
    lossTags,
  }
}

/**
 * 백업 파일을 검사하고 현재 스키마에 맞게 변환한다.
 * 스키마 버전이 올라가면 여기에 이전 버전 → 새 버전 변환을 추가한다.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다')
  }
  const file = raw as Partial<BackupFile> | null
  if (!file || file.app !== APP_ID || typeof file.schemaVersion !== 'number') {
    throw new Error('이 앱의 백업 파일이 아닙니다')
  }
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new Error('더 새로운 버전에서 만든 백업입니다. 앱을 업데이트한 뒤 다시 시도하세요')
  }
  const tables = [file.decks, file.events, file.matches, file.lossTags]
  if (!tables.every(Array.isArray)) throw new Error('백업 파일의 내용이 올바르지 않습니다')
  // (현재는 v1 뿐이라 변환할 것이 없다)
  const backup = file as BackupFile
  // 가져오기는 기존 기록을 모두 지우므로, 화면이 깨질 만한 레코드가 있으면 미리 거부한다
  const ok =
    backup.decks.every((d) => isStr(d?.id) && isStr(d.name)) &&
    backup.events.every((e) => isStr(e?.id) && isStr(e.date) && isStr(e.myDeckId)) &&
    backup.lossTags.every((t) => isStr(t?.id) && isStr(t.label)) &&
    backup.matches.every(
      (m) =>
        isStr(m?.id) &&
        isStr(m.date) &&
        isStr(m.myDeckId) &&
        STAGES.includes(m.stage) &&
        Object.hasOwn(RESULT_LABEL, m.result) &&
        Array.isArray(m.lossTagIds),
    )
  if (!ok) throw new Error('백업 파일의 일부 기록이 손상되어 가져올 수 없습니다')
  return backup
}

const isStr = (v: unknown): v is string => typeof v === 'string'

/** 현재 데이터를 모두 지우고 백업 내용으로 바꾼다 */
export async function importBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', db.decks, db.events, db.matches, db.lossTags, async () => {
    await Promise.all([db.decks.clear(), db.events.clear(), db.matches.clear(), db.lossTags.clear()])
    await db.decks.bulkAdd(file.decks)
    await db.events.bulkAdd(file.events)
    await db.matches.bulkAdd(file.matches)
    await db.lossTags.bulkAdd(file.lossTags)
  })
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 경기 한 줄 = CSV 한 줄 */
export async function buildCsv(): Promise<string> {
  const { decks, events, matches, lossTags } = await buildBackup()
  const deckName = new Map(decks.map((d) => [d.id, d.name]))
  const eventById = new Map(events.map((e) => [e.id, e]))
  const tagLabel = new Map(lossTags.map((t) => [t.id, t.label]))

  const header = [
    '날짜', '유형', '대회', '매장', '포맷', '라운드', '형식',
    '내 덱', '상대 덱', '선후공', '결과', '패배 원인', '메모',
  ]
  const ordered = sortMatches(matches).sort(
    (a, b) => a.date.localeCompare(b.date) || (a.eventId ?? '').localeCompare(b.eventId ?? ''),
  )
  const rows = ordered.map((m) => {
    const ev = m.eventId ? eventById.get(m.eventId) : undefined
    return [
      m.date,
      ev ? '대회' : '친선',
      ev?.name ?? '',
      ev?.store ?? '',
      m.format,
      ev ? matchLabel(m) : '',
      m.matchFormat === 'bo3' ? 'Bo3' : '단판',
      deckName.get(m.myDeckId) ?? '',
      m.oppDeckId ? (deckName.get(m.oppDeckId) ?? '') : '',
      m.turnOrder ? TURN_LABEL[m.turnOrder] : '',
      RESULT_LABEL[m.result],
      m.lossTagIds.map((id) => tagLabel.get(id) ?? '').filter(Boolean).join(' / '),
      m.memo,
    ]
  })
  // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function markBackedUp(): Promise<void> {
  await setSetting(LAST_BACKUP_KEY, Date.now())
}
