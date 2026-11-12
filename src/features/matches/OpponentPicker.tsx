import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { inputCls } from '../../components/styles'
import { ensureDeck } from '../../db/repo'
import type { Deck, ID } from '../../db/schema'

interface Props {
  /** 전체 덱 */
  decks: Deck[]
  /** 빠른 선택에 띄울 덱 (최근 많이 만난 순) */
  ranked: Deck[]
  /** undefined = 아직 안 고름, null = 모름 */
  value: ID | null | undefined
  onChange: (value: ID | null) => void
}

/** 상대 덱 선택: 자주 만난 덱은 칩으로, 없는 덱은 검색창에서 바로 추가 */
export function OpponentPicker({ decks, ranked, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const active = decks.filter((d) => !d.archived)
  // 이름이 검색어로 시작하는 덱을 앞에 둔다 (정확히 같은 덱이 6개 밖으로 밀려나지 않게)
  const results = q
    ? active
        .filter((d) => d.name.toLowerCase().includes(q))
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) ||
            a.name.length - b.name.length,
        )
        .slice(0, 6)
    : []
  const exact = active.find((d) => d.name.toLowerCase() === q)

  // 선택한 덱이 빠른 선택 목록에 없으면 맨 앞에 붙여 보여준다
  const selected = value ? decks.find((d) => d.id === value) : undefined
  const chips = selected && !ranked.some((d) => d.id === selected.id) ? [selected, ...ranked] : ranked

  const pick = (id: ID | null) => {
    onChange(id)
    setQuery('')
  }

  const create = async () => {
    if (!query.trim()) return
    const deck = await ensureDeck(query)
    pick(deck.id)
  }

  return (
    <div className="space-y-3">
      <input
        className={inputCls}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (exact) pick(exact.id)
          else void create()
          e.currentTarget.blur()
        }}
        placeholder="덱 검색 또는 새로 추가"
        aria-label="상대 덱 검색 또는 새로 추가"
        enterKeyHint="done"
        autoComplete="off"
      />

      {q ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {results.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="flex min-h-13 w-full items-center px-4 text-left text-[16px] active:bg-surface-2"
                onClick={() => pick(d.id)}
              >
                {d.name}
              </button>
            </li>
          ))}
          {!exact && (
            <li>
              <button
                type="button"
                className="flex min-h-13 w-full items-center px-4 text-left text-[16px] font-semibold text-accent active:bg-surface-2"
                onClick={() => void create()}
              >
                ＋ '{query.trim()}' 새로 추가
              </button>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((d) => (
            <Chip key={d.id} selected={d.id === value} onClick={() => pick(d.id)}>
              {d.name}
            </Chip>
          ))}
          <Chip selected={value === null} onClick={() => pick(null)} className="text-ink-2">
            모름
          </Chip>
        </div>
      )}
    </div>
  )
}
