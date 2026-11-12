import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Chip } from '../../components/Chip'
import { PageHeader } from '../../components/PageHeader'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { ghostBtnCls, inputCls, primaryBtnCls, sectionTitleCls } from '../../components/styles'
import { useToast } from '../../components/toast-context'
import { useDecks, useEvents, useLossTags, useMatches } from '../../db/hooks'
import { addMatch, deleteMatch, restoreMatch, updateMatch } from '../../db/repo'
import {
  RESULT_LABEL,
  STAGE_LABEL,
  STAGES,
  type Deck,
  type EventRecord,
  type ID,
  type LossTag,
  type Match,
  type MatchFormat,
  type Result,
  type Stage,
  type TurnOrder,
} from '../../db/schema'
import { rankOpponentDecks } from '../../domain/deckRanking'
import { defaultFormat, matchLabel } from '../../domain/summary'
import { todayStr } from '../../lib/date'
import { MyDeckSelect } from '../decks/MyDeckSelect'
import { OpponentPicker } from './OpponentPicker'

const isStage = (v: string | null): v is Stage => STAGES.includes(v as Stage)

/**
 * 경기 입력/수정 화면.
 * - /events/:eventId/match/new?stage=… : 대회 라운드 추가
 * - /match/new : 단독 1판 기록
 * - /match/:matchId : 기존 기록 수정
 */
export default function MatchPage() {
  const { eventId, matchId } = useParams()
  const [params] = useSearchParams()
  const events = useEvents()
  const matches = useMatches()
  const decks = useDecks()
  const lossTags = useLossTags()
  if (!events || !matches || !decks || !lossTags) return null

  const existing = matchId ? matches.find((m) => m.id === matchId) : undefined
  if (matchId && !existing) return <Navigate to="/" replace />
  const evId = existing ? existing.eventId : (eventId ?? null)
  const event = evId ? events.find((e) => e.id === evId) : undefined
  if (evId && !event) return <Navigate to="/" replace />

  const stageParam = params.get('stage')
  const stage: Stage = existing?.stage ?? (isStage(stageParam) ? stageParam : 'swiss')

  return (
    <MatchForm
      key={matchId ?? `${evId}-${stage}`}
      existing={existing}
      event={event}
      initialStage={stage}
      decks={decks}
      matches={matches}
      lossTags={lossTags}
    />
  )
}

interface FormProps {
  existing?: Match
  event?: EventRecord
  initialStage: Stage
  decks: Deck[]
  matches: Match[]
  lossTags: LossTag[]
}

function MatchForm({ existing, event, initialStage, decks, matches, lossTags }: FormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const backTo = event ? `/events/${event.id}` : '/'
  const eventMatches = event ? matches.filter((m) => m.eventId === event.id) : []

  const [stage, setStage] = useState<Stage>(initialStage)
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(
    () => existing?.matchFormat ?? (event ? defaultFormat(initialStage, eventMatches) : 'bo1'),
  )
  const [oppDeckId, setOppDeckId] = useState<ID | null | undefined>(
    existing ? existing.oppDeckId : undefined,
  )
  const [turnOrder, setTurnOrder] = useState<TurnOrder | null>(existing?.turnOrder ?? null)
  const [result, setResult] = useState<Result | null>(existing?.result ?? null)
  const [lossTagIds, setLossTagIds] = useState<ID[]>(existing?.lossTagIds ?? [])
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const [memoOpen, setMemoOpen] = useState(!!existing)
  // 단독 기록에서만 쓰는 값: 직전에 쓴 덱을 기본으로 고른다
  const [myDeckId, setMyDeckId] = useState<ID | null>(() => {
    if (existing) return existing.myDeckId
    const last = [...matches].sort((a, b) => b.createdAt - a.createdAt)[0]
    const lastDeck = decks.find((d) => d.id === last?.myDeckId && !d.archived)
    return lastDeck?.id ?? decks.find((d) => d.isMine && !d.archived)?.id ?? null
  })
  const [date, setDate] = useState(existing?.date ?? todayStr())
  const [busy, setBusy] = useState(false)
  /** 방금 저장한 패배 기록 (패배 원인 창을 띄우는 동안 보관) */
  const [savedLoss, setSavedLoss] = useState<Match | null>(null)

  // 저장 후 목록이 갱신돼도 제목이 바뀌지 않도록 처음 한 번만 계산한다
  const [newLabel] = useState(() => {
    if (!event) return '단독 1판'
    if (initialStage !== 'swiss') return STAGE_LABEL[initialStage]
    return `R${eventMatches.filter((m) => m.stage === 'swiss').length + 1}`
  })
  const title = existing
    ? stage === existing.stage
      ? matchLabel(existing)
      : STAGE_LABEL[stage]
    : newLabel

  const ranked = useMemo(() => rankOpponentDecks(decks, matches), [decks, matches])
  const activeTags = lossTags.filter((t) => !t.archived)
  const hasDeck = !!event || !!myDeckId
  const canSave = hasDeck && oppDeckId !== undefined && turnOrder !== null

  // ── 새 기록: 결과 버튼을 누르는 순간 저장한다 ──
  const finish = (m: Match) => {
    navigate(backTo, { replace: true })
    toast({
      message: `${matchLabel(m)} ${RESULT_LABEL[m.result]} 저장됨`,
      actionLabel: '되돌리기',
      onAction: async () => {
        await deleteMatch(m.id)
      },
    })
  }

  const save = async (res: Result) => {
    if (busy) return
    setBusy(true)
    const isBye = res === 'bye'
    let m: Match
    try {
      m = await addMatch({
        eventId: event?.id ?? null,
        stage,
        matchFormat,
        oppDeckId: isBye ? null : (oppDeckId ?? null),
        turnOrder: isBye ? null : turnOrder,
        result: res,
        memo: memo.trim(),
        date,
        myDeckId: myDeckId ?? undefined,
      })
    } catch (err) {
      setBusy(false)
      toast({ message: `저장하지 못했습니다: ${(err as Error).message}` })
      return
    }
    if (res === 'loss' && activeTags.length > 0) setSavedLoss(m)
    else finish(m)
  }

  const chooseLossTag = async (tagId: ID | null) => {
    if (!savedLoss) return
    // 태그와 바깥 영역을 연달아 눌러도 한 번만 처리한다
    const m = savedLoss
    setSavedLoss(null)
    if (tagId) await updateMatch(m.id, { lossTagIds: [tagId] })
    finish(m)
  }

  // ── 기존 기록 수정 ──
  const editValid = result === 'bye' || (result !== null && turnOrder !== null)

  const saveEdit = async () => {
    if (!existing || !result || busy) return
    setBusy(true)
    const isBye = result === 'bye'
    try {
      await updateMatch(existing.id, {
        stage,
        matchFormat,
        oppDeckId: isBye ? null : (oppDeckId ?? null),
        turnOrder: isBye ? null : turnOrder,
        result,
        lossTagIds: result === 'loss' ? lossTagIds : [],
        memo: memo.trim(),
        ...(event || !myDeckId ? {} : { date, myDeckId }),
      })
    } catch (err) {
      setBusy(false)
      toast({ message: `저장하지 못했습니다: ${(err as Error).message}` })
      return
    }
    navigate(backTo, { replace: true })
    toast({ message: '수정했습니다', duration: 2500 })
  }

  const remove = async () => {
    if (!existing) return
    navigate(backTo, { replace: true })
    const removed = await deleteMatch(existing.id)
    if (!removed) return
    toast({
      message: `${matchLabel(existing)} 삭제됨`,
      actionLabel: '되돌리기',
      onAction: () => restoreMatch(removed),
    })
  }

  const toggleTag = (id: ID) =>
    setLossTagIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const isBye = result === 'bye'

  return (
    <div className={`mx-auto max-w-md ${existing ? 'pb-32' : 'pb-64'}`}>
      <PageHeader
        title={existing ? `${title} 수정` : `${title} 기록`}
        subtitle={event?.name}
        backTo={backTo}
        right={
          existing && (
            <button
              type="button"
              className="h-12 shrink-0 rounded-xl px-3 text-[15px] font-medium text-loss active:bg-surface-2"
              onClick={() => void remove()}
            >
              삭제
            </button>
          )
        }
      />

      <div className="space-y-5 px-4 pt-1">
        {!event && (
          <section className="space-y-3">
            <div>
              <h2 className={sectionTitleCls}>내 덱</h2>
              <MyDeckSelect decks={decks} value={myDeckId} onChange={setMyDeckId} />
            </div>
            <label className="block">
              <span className={`${sectionTitleCls} block`}>날짜</span>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value || todayStr())}
              />
            </label>
          </section>
        )}

        {existing && event && (
          <section>
            <h2 className={sectionTitleCls}>단계</h2>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Chip key={s} selected={s === stage} onClick={() => setStage(s)}>
                  {STAGE_LABEL[s]}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={sectionTitleCls}>형식</h2>
          <Segmented
            label="형식"
            options={[
              { value: 'bo1', label: '단판' },
              { value: 'bo3', label: 'Bo3' },
            ]}
            value={matchFormat}
            onChange={setMatchFormat}
          />
        </section>

        {existing && (
          <section>
            <h2 className={sectionTitleCls}>결과</h2>
            <Segmented
              label="결과"
              options={[
                { value: 'win', label: '승' },
                { value: 'loss', label: '패' },
                { value: 'draw', label: '무' },
                ...(event ? [{ value: 'bye' as const, label: '부전승' }] : []),
              ]}
              value={result}
              onChange={setResult}
            />
          </section>
        )}

        {!isBye && (
          <>
            <section>
              <h2 className={sectionTitleCls}>상대 덱</h2>
              <OpponentPicker decks={decks} ranked={ranked} value={oppDeckId} onChange={setOppDeckId} />
            </section>

            <section>
              <h2 className={sectionTitleCls}>
                선후공{matchFormat === 'bo3' && ' (1게임 기준)'}
              </h2>
              <Segmented
                label="선후공"
                size="lg"
                options={[
                  { value: 'first', label: '선공' },
                  { value: 'second', label: '후공' },
                ]}
                value={turnOrder}
                onChange={setTurnOrder}
              />
            </section>
          </>
        )}

        {existing && result === 'loss' && activeTags.length > 0 && (
          <section>
            <h2 className={sectionTitleCls}>패배 원인 (여러 개 선택 가능)</h2>
            <div className="flex flex-wrap gap-2">
              {activeTags.map((t) => (
                <Chip key={t.id} selected={lossTagIds.includes(t.id)} onClick={() => toggleTag(t.id)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section>
          {memoOpen ? (
            <label className="block">
              <span className={`${sectionTitleCls} block`}>메모</span>
              <textarea
                className={`${inputCls} h-24 resize-none py-2`}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="기억해 둘 내용"
              />
            </label>
          ) : (
            <button
              type="button"
              className="h-12 text-[14px] font-medium text-ink-2 underline underline-offset-4"
              onClick={() => setMemoOpen(true)}
            >
              메모 추가
            </button>
          )}
        </section>
      </div>

      {/* 엄지가 닿는 하단 고정 영역 */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-md space-y-2 px-4 pt-3">
          {existing ? (
            <button
              type="button"
              className={`${primaryBtnCls} h-16 w-full text-[19px]`}
              disabled={!editValid || busy}
              onClick={() => void saveEdit()}
            >
              저장
            </button>
          ) : (
            <>
              {!canSave && (
                <p className="text-center text-[13px] text-ink-2">
                  {!hasDeck
                    ? '내 덱을 고르세요'
                    : oppDeckId === undefined
                      ? '상대 덱을 고르세요'
                      : '선공/후공을 고르세요'}
                </p>
              )}
              <div className={`grid gap-2 ${event ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button type="button" className={ghostBtnCls} disabled={!canSave || busy} onClick={() => void save('draw')}>
                  무승부
                </button>
                {event && (
                  <button type="button" className={ghostBtnCls} disabled={busy} onClick={() => void save('bye')}>
                    부전승
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="h-20 rounded-2xl bg-win text-[28px] font-bold text-win-ink active:opacity-80 disabled:opacity-35"
                  disabled={!canSave || busy}
                  onClick={() => void save('win')}
                >
                  승
                </button>
                <button
                  type="button"
                  className="h-20 rounded-2xl bg-loss text-[28px] font-bold text-loss-ink active:opacity-80 disabled:opacity-35"
                  disabled={!canSave || busy}
                  onClick={() => void save('loss')}
                >
                  패
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {savedLoss && (
        <Sheet
          title="패배 원인"
          description="패배는 이미 저장했습니다. 원인을 하나 누르거나 건너뛰세요."
          onClose={() => void chooseLossTag(null)}
        >
          <div className="grid grid-cols-2 gap-2">
            {activeTags.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${ghostBtnCls} h-16 text-[16px] font-semibold`}
                onClick={() => void chooseLossTag(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 h-12 w-full text-[15px] font-medium text-ink-2"
            onClick={() => void chooseLossTag(null)}
          >
            건너뛰기
          </button>
        </Sheet>
      )}
    </div>
  )
}
