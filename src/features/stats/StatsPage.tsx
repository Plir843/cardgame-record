import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { PageHeader } from '../../components/PageHeader'
import { cardCls, sectionTitleCls } from '../../components/styles'
import { useDecks, useLossTags, useMatches } from '../../db/hooks'
import type { ID } from '../../db/schema'
import { deckNamer } from '../../domain/deckName'
import { computeStats, UNKNOWN_DECK } from '../../domain/stats'
import { percentText, rateOf, recordText, totalOf, type Tally } from '../../domain/tally'

export default function StatsPage() {
  const matches = useMatches()
  const decks = useDecks()
  const lossTags = useLossTags()
  const [myDeckId, setMyDeckId] = useState<ID | null>(null)

  if (!matches || !decks || !lossTags) return null

  const nameOf = deckNamer(decks, '삭제된 덱')
  const deckName = (id: string) => (id === UNKNOWN_DECK ? '모름' : nameOf(id))
  const stats = computeStats(matches, { myDeckId: myDeckId ?? undefined })
  const byGames = (a: [string, Tally], b: [string, Tally]) =>
    totalOf(b[1]) - totalOf(a[1]) || (rateOf(b[1]) ?? 0) - (rateOf(a[1]) ?? 0)
  const myDecks = [...stats.byMyDeck.entries()].sort(byGames)
  const opps = [...stats.byOpp.entries()].sort(byGames)
  const tagRows = lossTags
    .map((t) => ({ tag: t, count: stats.lossTags.get(t.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  if (stats.byMyDeck.size === 0) {
    return (
      <>
        <PageHeader title="통계" />
        <p className="px-4 py-10 text-center text-[15px] text-ink-2">
          라운드를 기록하면 덱별 승률과 상성이 여기에 나옵니다.
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="통계" />
      <div className="space-y-6 px-4 pt-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip selected={myDeckId === null} onClick={() => setMyDeckId(null)} className="shrink-0">
            전체
          </Chip>
          {myDecks.map(([id]) => (
            <Chip key={id} selected={myDeckId === id} onClick={() => setMyDeckId(id)} className="shrink-0">
              {deckName(id)}
            </Chip>
          ))}
        </div>

        <section className={`${cardCls} flex items-end justify-between p-4`}>
          <div>
            <p className="text-[14px] text-ink-2">{myDeckId ? deckName(myDeckId) : '전체'} 승률</p>
            <p className="mt-1 text-[40px] font-bold leading-none tabular-nums">
              {percentText(stats.overall)}
            </p>
          </div>
          <p className="text-right text-[15px] text-ink-2">
            {totalOf(stats.overall)}판
            <br />
            <span className="font-semibold text-ink">{recordText(stats.overall)}</span>
          </p>
        </section>

        <section>
          <h2 className={sectionTitleCls}>내 덱별 승률</h2>
          <div className={`${cardCls} divide-y divide-line`}>
            {myDecks.map(([id, t]) => (
              <RateRow key={id} label={deckName(id)} tally={t} />
            ))}
          </div>
        </section>

        <section>
          <h2 className={sectionTitleCls}>상대 덱별 상성</h2>
          {opps.length === 0 ? (
            <Empty />
          ) : (
            <div className={`${cardCls} divide-y divide-line`}>
              {opps.map(([id, t]) => (
                <RateRow key={id} label={`vs ${deckName(id)}`} tally={t} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className={sectionTitleCls}>선공/후공 (단판 기준)</h2>
          <div className={`${cardCls} divide-y divide-line`}>
            <RateRow label="선공" tally={stats.first} />
            <RateRow label="후공" tally={stats.second} />
          </div>
          {totalOf(stats.bo3) > 0 && (
            <p className="mt-2 text-[13px] text-ink-2">
              Bo3 매치 {recordText(stats.bo3)} 는 1게임 선후공이 승패를 결정하지 않아 여기서 제외했습니다.
            </p>
          )}
        </section>

        <section>
          <h2 className={sectionTitleCls}>패배 원인</h2>
          {tagRows.length === 0 ? (
            <Empty text="패배에 원인 태그를 붙이면 여기에 모입니다." />
          ) : (
            <div className={`${cardCls} divide-y divide-line`}>
              {tagRows.map(({ tag, count }) => (
                <div key={tag.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[16px] font-medium">{tag.label}</span>
                    <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
                      {count}회 · 패배의 {Math.round((count / stats.lossCount) * 100)}%
                    </span>
                  </div>
                  <Bar ratio={count / stats.lossCount} color="bg-loss" />
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="pb-2 text-[13px] text-ink-2">부전승은 통계에서 제외하고, 무승부는 판수에 포함합니다.</p>
      </div>
    </>
  )
}

function Empty({ text = '아직 기록이 없습니다.' }: { text?: string }) {
  return <p className="py-3 text-[14px] text-ink-2">{text}</p>
}

function Bar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  )
}

/** 이름, 전적, 승률 막대 한 줄 */
function RateRow({ label, tally }: { label: string; tally: Tally }) {
  const rate = rateOf(tally)
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[16px] font-medium">{label}</span>
        <span className="shrink-0 text-[14px] tabular-nums text-ink-2">
          {totalOf(tally) > 0 ? recordText(tally) : '기록 없음'}
          <span className="ml-2 inline-block w-11 text-right text-[16px] font-bold text-ink">
            {percentText(tally)}
          </span>
        </span>
      </div>
      <Bar ratio={rate ?? 0} color="bg-win" />
    </div>
  )
}
