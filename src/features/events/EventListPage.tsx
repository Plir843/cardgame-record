import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { cardCls, primaryBtnCls, sectionTitleCls } from '../../components/styles'
import { useDecks, useEvents, useMatches } from '../../db/hooks'
import type { EventRecord, Match } from '../../db/schema'
import { deckNamer } from '../../domain/deckName'
import { nextAction, summarizeEvent } from '../../domain/summary'
import { recordShort, recordText } from '../../domain/tally'
import { formatDate, todayStr } from '../../lib/date'
import { MatchRow } from '../matches/MatchRow'

export default function EventListPage() {
  const events = useEvents()
  const matches = useMatches()
  const decks = useDecks()
  if (!events || !matches || !decks) return null

  const deckName = deckNamer(decks)
  const byEvent = new Map<string, Match[]>()
  for (const m of matches) {
    if (!m.eventId) continue
    const list = byEvent.get(m.eventId) ?? []
    list.push(m)
    byEvent.set(m.eventId, list)
  }
  const sorted = [...events].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  )
  const standalone = matches
    .filter((m) => !m.eventId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const today = todayStr()

  return (
    <>
      <PageHeader
        title="대회"
        right={
          <Link
            to="/match/new"
            className="flex h-12 items-center rounded-xl px-3 text-[14px] font-medium text-ink-2 active:bg-surface-2"
          >
            단독 1판 기록
          </Link>
        }
      />
      <div className="space-y-3 px-4 pt-2">
        {sorted.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[18px] font-bold">아직 기록한 대회가 없습니다</p>
            <p className="mt-2 text-[15px] text-ink-2">
              대회를 만들면 라운드마다 상대 덱, 선후공, 승패만 누르면 됩니다.
            </p>
            <Link to="/events/new" className={`${primaryBtnCls} mx-auto mt-6 w-56`}>
              첫 대회 만들기
            </Link>
          </div>
        )}

        {sorted.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            matches={byEvent.get(ev.id) ?? []}
            deckName={deckName(ev.myDeckId)}
            isToday={ev.date === today}
          />
        ))}

        {standalone.length > 0 && (
          <section className="pt-4">
            <h2 className={sectionTitleCls}>단독 기록 {standalone.length}</h2>
            <ul className={`${cardCls} divide-y divide-line overflow-hidden`}>
              {standalone.map((m) => (
                <li key={m.id}>
                  <MatchRow
                    match={m}
                    oppName={deckName(m.oppDeckId)}
                    label={m.date.slice(5).replace('-', '/')}
                    note={`내 덱 ${deckName(m.myDeckId)}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {sorted.length > 0 && (
        <Link
          to="/events/new"
          className="fixed right-4 z-20 flex h-14 items-center gap-1 rounded-full bg-accent px-5 text-[16px] font-bold text-accent-ink shadow-lg active:opacity-80"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 84px)' }}
        >
          ＋ 새 대회
        </Link>
      )}
    </>
  )
}

function EventCard({
  event,
  matches,
  deckName,
  isToday,
}: {
  event: EventRecord
  matches: Match[]
  deckName: string
  isToday: boolean
}) {
  const summary = summarizeEvent(matches)
  const next = nextAction(matches)
  const meta = [formatDate(event.date), event.store, event.format].filter(Boolean).join(' · ')
  const sub = [
    summary.topLabel && `예선 ${recordShort(summary.swiss)} · ${summary.topLabel}`,
    event.finalRank &&
      (event.participants ? `${event.finalRank}위/${event.participants}명` : `${event.finalRank}위`),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={`${cardCls} overflow-hidden ${isToday ? 'border-accent' : ''}`}>
      <Link to={`/events/${event.id}`} className="flex items-center gap-3 p-4 active:bg-surface-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-ink-2">{meta}</p>
          <h2 className="mt-0.5 truncate text-[17px] font-bold">{event.name}</h2>
          <p className="mt-0.5 truncate text-[14px] text-ink-2">{deckName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[20px] font-bold tabular-nums">
            {matches.length > 0 ? recordText(summary.total) : '기록 전'}
          </p>
          {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
        </div>
      </Link>
      {/* 오늘 대회는 목록에서 바로 다음 라운드를 기록할 수 있다 */}
      {isToday && next && (
        <div className="px-4 pb-4">
          <Link
            to={`/events/${event.id}/match/new?stage=${next.stage}`}
            className={`${primaryBtnCls} w-full`}
          >
            {next.label} 기록
          </Link>
        </div>
      )}
    </article>
  )
}
