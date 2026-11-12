import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { inputCls } from '../../components/styles'
import { ensureDeck } from '../../db/repo'
import type { Deck, ID } from '../../db/schema'

interface Props {
  decks: Deck[]
  value: ID | null
  onChange: (id: ID) => void
}

/** 내 덱을 칩으로 고르고, 없으면 그 자리에서 바로 추가한다 */
export function MyDeckSelect({ decks, value, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  // 숨긴 덱이라도 현재 선택된 덱이면 보여준다 (과거 대회 수정 시)
  const mine = decks
    .filter((d) => (d.isMine && !d.archived) || d.id === value)
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const add = async () => {
    if (!name.trim()) return
    const deck = await ensureDeck(name, { isMine: true })
    onChange(deck.id)
    setName('')
    setAdding(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {mine.map((d) => (
          <Chip key={d.id} selected={d.id === value} onClick={() => onChange(d.id)}>
            {d.name}
          </Chip>
        ))}
        {!adding && mine.length > 0 && <Chip onClick={() => setAdding(true)}>＋ 새 덱</Chip>}
      </div>
      {/* 다른 폼 안에서도 쓰이므로 form 태그 대신 Enter 키를 직접 처리한다 */}
      {(adding || mine.length === 0) && (
        <div className="flex gap-2">
          <input
            autoFocus={adding}
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void add()
              }
            }}
            placeholder="내 덱 이름"
            aria-label="내 덱 이름"
            enterKeyHint="done"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => void add()}
            className="h-12 shrink-0 rounded-xl bg-accent px-5 font-bold text-accent-ink disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
