import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { cardCls, ghostBtnCls, primaryBtnCls, sectionTitleCls } from '../../components/styles'
import { useToast } from '../../components/toast-context'
import { useDecks, useEvents, useMatches } from '../../db/hooks'
import { deleteEvent, restoreEvent, updateEvent } from '../../db/repo'
import { STAGE_LABEL, TOP_STAGES, type EventRecord } from '../../db/schema'
import { deckNamer } from '../../domain/deckName'
import { nextAction, shareText, sortMatches, summarizeEvent } from '../../domain/summary'
import { recordShort, recordText } from '../../domain/tally'
import { copyText } from '../../lib/clipboard'
import { formatDate } from '../../lib/date'
import { MatchRow } from '../matches/MatchRow'

export default function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const events = useEvents()
  const allMatches = useMatches()
  const decks = useDecks()
  const [stageSheet, setStageSheet] = useState(false)

  if (!events || !allMatches || !decks) return null
  const event = events.find((e) => e.id === eventId)
  if (!event) return <Navigate to="/" replace />

  const deckName = deckNamer(decks)
  const matches = sortMatches(allMatches.filter((m) => m.eventId === event.id))
  const summary = summarizeEvent(matches)
  const next = nextAction(matches)
  const hasTop = matches.some((m) => m.stage !== 'swiss')
  const swissCount = matches.filter((m) => m.stage === 'swiss').length
  const entry = (stage: string) => `/events/${event.id}/match/new?stage=${stage}`
  const meta = [formatDate(event.date), event.store, event.format].filter(Boolean).join(' · ')

  const copy = async () => {
    const ok = await copyText(shareText(event, matches, deckName))
    toast({ message: ok ? '결과를 복사했습니다' : '복사하지 못했습니다', duration: 2500 })
  }

  const remove = async () => {
    navigate('/', { replace: true })
    const snap = await deleteEvent(event.id)
    if (!snap) return
    toast({
      message: `'${event.name}' 삭제됨`,
      actionLabel: '되돌리기',
      onAction: () => restoreEvent(snap),
      duration: 7000,
    })
  }

  return (
    <div className="mx-auto max-w-md pb-36">
      <PageHeader title={event.name} subtitle={meta} backTo="/" />

      <div className="space-y-5 px-4 pt-2">
        <section className={`${cardCls} p-4`}>
          <p className="text-[14px] text-ink-2">{deckName(event.myDeckId)}</p>
          <p className="mt-1 text-[34px] font-bold leading-none tabular-nums">
            {matches.length > 0 ? recordText(summary.total) : '기록 전'}
          </p>
          {summary.topLabel && (
            <p className="mt-2 text-[15px] text-ink-2">
              예선 {recordShort(summary.swiss)} · {summary.topLabel}
            </p>
          )}
          <RankInputs key={event.id} event={event} />
        </section>

        <section>
          <h2 className={sectionTitleCls}>라운드</h2>
          {matches.length === 0 ? (
            <p className="py-3 text-[15px] text-ink-2">아래 버튼으로 첫 라운드를 기록하세요.</p>
          ) : (
            <ul className={`${cardCls} divide-y divide-line overflow-hidden`}>
              {matches.map((m) => (
                <li key={m.id}>
                  <MatchRow match={m} oppName={deckName(m.oppDeckId)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-3 gap-2">
          <button type="button" className={ghostBtnCls} onClick={() => void copy()} disabled={matches.length === 0}>
            결과 복사
          </button>
          <Link to={`/events/${event.id}/edit`} className={ghostBtnCls}>
            대회 수정
          </Link>
          <button type="button" className={`${ghostBtnCls} text-loss`} onClick={() => void remove()}>
            삭제
          </button>
        </section>
      </div>

      {/* 엄지가 닿는 하단 고정 영역 */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2 px-4 pt-3">
          {next ? (
            <>
              <Link to={entry(next.stage)} className={`${primaryBtnCls} h-16 flex-1 text-[19px]`}>
                {next.label} 기록
              </Link>
              {hasTop ? (
                <Link to={entry('swiss')} className={`${ghostBtnCls} h-16 shrink-0`}>
                  예선 R{swissCount + 1}
                </Link>
              ) : (
                <button type="button" className={`${ghostBtnCls} h-16 shrink-0`} onClick={() => setStageSheet(true)}>
                  본선
                </button>
              )}
            </>
          ) : (
            // 본선에서 탈락했거나 결승까지 끝난 대회: 빠진 기록을 추가하는 버튼만 둔다
            <>
              <Link to={entry('swiss')} className={`${ghostBtnCls} h-14 flex-1`}>
                예선 R{swissCount + 1} 추가
              </Link>
              <button type="button" className={`${ghostBtnCls} h-14 flex-1`} onClick={() => setStageSheet(true)}>
                본선 추가
              </button>
            </>
          )}
        </div>
      </div>

      {stageSheet && (
        <Sheet
          title="본선 단계"
          description="4강과 결승은 Bo3 가 기본이며, 입력 화면에서 바꿀 수 있습니다."
          onClose={() => setStageSheet(false)}
        >
          <div className="grid grid-cols-2 gap-2 pb-2">
            {TOP_STAGES.map((s) => (
              <Link key={s} to={entry(s)} className={`${ghostBtnCls} h-16 text-[18px] font-bold`}>
                {STAGE_LABEL[s]}
              </Link>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}

/**
 * 최종 순위는 자동 계산할 수 없어 직접 입력한다.
 * 입력하는 즉시 저장한다 (폰에서 앱을 바로 닫으면 blur 가 오지 않아 값이 사라질 수 있으므로)
 */
function RankInputs({ event }: { event: EventRecord }) {
  const parse = (v: string) => {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const save = (key: 'finalRank' | 'participants', raw: string) => {
    const v = parse(raw)
    if (v === event[key]) return
    void updateEvent(event.id, key === 'finalRank' ? { finalRank: v } : { participants: v })
  }
  const small =
    'h-11 w-16 shrink-0 rounded-xl border border-line bg-bg text-center tabular-nums text-ink placeholder:text-ink-2 focus:border-accent focus:outline-none'
  return (
    <div className="mt-4 flex items-center gap-2 whitespace-nowrap text-[15px] text-ink-2">
      <span>최종 순위</span>
      <input
        className={small}
        inputMode="numeric"
        defaultValue={event.finalRank ?? ''}
        placeholder="-"
        aria-label="최종 순위"
        onChange={(e) => save('finalRank', e.target.value)}
      />
      <span>위 /</span>
      <input
        className={small}
        inputMode="numeric"
        defaultValue={event.participants ?? ''}
        placeholder="-"
        aria-label="참가자 수"
        onChange={(e) => save('participants', e.target.value)}
      />
      <span>명</span>
    </div>
  )
}
