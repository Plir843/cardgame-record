// 데이터 모델 정의 (Dexie 스키마 v1)
// 구조를 바꿀 때는 db.ts 에 새 version 과 upgrade 를 추가하고,
// backup.ts 의 parseBackup 에도 같은 변환을 넣는다.

export type ID = string

/** 예선(스위스) / 16강 / 8강 / 4강 / 결승 */
export type Stage = 'swiss' | 'top16' | 'top8' | 'semi' | 'final'
export type MatchFormat = 'bo1' | 'bo3'
export type TurnOrder = 'first' | 'second'
export type Result = 'win' | 'loss' | 'draw' | 'bye'

export interface Deck {
  id: ID
  name: string
  /** 내 덱 목록에 표시할지 여부 */
  isMine: boolean
  /** 삭제 대신 숨김 처리 (과거 기록의 참조를 보존) */
  archived: boolean
  createdAt: number
  updatedAt: number
}

/** 대회 */
export interface EventRecord {
  id: ID
  name: string
  /** 'YYYY-MM-DD' */
  date: string
  /** 매장 (없으면 빈 문자열) */
  store: string
  /** 'BT23' 같은 포맷 (없으면 빈 문자열) */
  format: string
  myDeckId: ID
  /** 최종 순위와 참가자 수는 직접 입력한다 */
  finalRank: number | null
  participants: number | null
  /** 직접 종료한 대회 (스위스만으로 끝난 경우 등). 스키마 v2 에서 추가 */
  closed: boolean
  memo: string
  createdAt: number
  updatedAt: number
}

/** 라운드 1개, 또는 대회에 속하지 않는 단독 1판 */
export interface Match {
  id: ID
  /** null 이면 단독(친선) 기록 */
  eventId: ID | null
  stage: Stage
  /** 예선 라운드 번호 (본선과 단독 기록은 null) */
  round: number | null
  /** 라운드별 단판/Bo3 */
  matchFormat: MatchFormat
  /** 대회 안에서 기록된 순서 */
  seq: number
  /** 아래 세 값은 대회 값을 복사해 둔다 (통계와 기간/포맷 필터용) */
  date: string
  format: string
  myDeckId: ID
  /** null 이면 모름 또는 부전승 */
  oppDeckId: ID | null
  /** Bo3 는 1게임 기준 */
  turnOrder: TurnOrder | null
  result: Result
  lossTagIds: ID[]
  memo: string
  createdAt: number
  updatedAt: number
}

export interface LossTag {
  id: ID
  label: string
  order: number
  archived: boolean
}

export interface Setting {
  key: string
  value: unknown
}

/**
 * 스키마 버전 기록
 * - v1: 최초
 * - v2: EventRecord.closed 추가 (기존 대회는 false)
 */
export const SCHEMA_VERSION = 2

export const STAGES: Stage[] = ['swiss', 'top16', 'top8', 'semi', 'final']
export const TOP_STAGES: Stage[] = ['top16', 'top8', 'semi', 'final']

export const TURN_LABEL: Record<TurnOrder, string> = {
  first: '선공',
  second: '후공',
}

export const STAGE_LABEL: Record<Stage, string> = {
  swiss: '예선',
  top16: '16강',
  top8: '8강',
  semi: '4강',
  final: '결승',
}

export const RESULT_LABEL: Record<Result, string> = {
  win: '승',
  loss: '패',
  draw: '무',
  bye: '부전승',
}

export const DEFAULT_LOSS_TAGS: LossTag[] = [
  { id: 'default-brick', label: '패 말림', order: 0, archived: false },
  { id: 'default-matchup', label: '상대 덱 상성', order: 1, archived: false },
  { id: 'default-misplay', label: '플레이 실수', order: 2, archived: false },
  { id: 'default-time', label: '시간 부족', order: 3, archived: false },
]
