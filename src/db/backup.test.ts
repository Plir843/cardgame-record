import { describe, expect, it } from 'vitest'
import { makeDeck, makeEvent, makeMatch } from '../test/fixtures'
import { parseBackup } from './backup'
import { DEFAULT_LOSS_TAGS, SCHEMA_VERSION } from './schema'

const valid = () => ({
  app: 'digimon-record',
  schemaVersion: SCHEMA_VERSION,
  exportedAt: '2026-11-12T00:00:00.000Z',
  decks: [makeDeck({ id: 'mine', name: '내 덱', isMine: true })],
  events: [makeEvent()],
  matches: [makeMatch()],
  lossTags: DEFAULT_LOSS_TAGS,
})

const parse = (obj: unknown) => parseBackup(JSON.stringify(obj))

describe('parseBackup', () => {
  it('정상 백업은 그대로 통과한다', () => {
    const file = valid()
    expect(parse(file)).toEqual(file)
  })

  it('v1 백업은 대회에 closed: false 를 채워 현재 버전으로 바꾼다', () => {
    const { closed: _omit, ...v1Event } = makeEvent()
    const parsed = parse({ ...valid(), schemaVersion: 1, events: [v1Event] })
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.events[0]).toEqual({ ...v1Event, closed: false })
  })

  it('JSON 이 아니면 거부한다', () => {
    expect(() => parseBackup('{not json')).toThrow('JSON 파일을 읽을 수 없습니다')
  })

  it('다른 앱의 파일은 거부한다', () => {
    expect(() => parse({ ...valid(), app: 'other' })).toThrow('이 앱의 백업 파일이 아닙니다')
    expect(() => parse(null)).toThrow('이 앱의 백업 파일이 아닙니다')
  })

  it('더 새로운 버전의 백업은 거부한다', () => {
    expect(() => parse({ ...valid(), schemaVersion: SCHEMA_VERSION + 1 })).toThrow('더 새로운 버전')
  })

  it('테이블이 빠져 있으면 거부한다', () => {
    const { matches: _omit, ...rest } = valid()
    expect(() => parse(rest)).toThrow('내용이 올바르지 않습니다')
  })

  it.each([
    ['결과 값이 이상한 경기', { matches: [{ ...makeMatch(), result: 'toString' }] }],
    ['단계 값이 이상한 경기', { matches: [{ ...makeMatch(), stage: 'top4' }] }],
    ['패배 원인이 배열이 아닌 경기', { matches: [{ ...makeMatch(), lossTagIds: null }] }],
    ['이름이 없는 덱', { decks: [{ id: 'x' }] }],
    ['덱이 없는 대회', { events: [{ ...makeEvent(), myDeckId: undefined }] }],
    ['null 레코드', { lossTags: [null] }],
  ])('%s 이 있으면 거부한다', (_label, patch) => {
    expect(() => parse({ ...valid(), ...patch })).toThrow('손상')
  })
})
