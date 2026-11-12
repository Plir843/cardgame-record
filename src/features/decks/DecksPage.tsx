import { useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { cardCls, inputCls, sectionTitleCls } from '../../components/styles'
import { useToast } from '../../components/toast-context'
import { useDecks } from '../../db/hooks'
import { ensureDeck, renameDeck, updateDeck } from '../../db/repo'
import type { Deck } from '../../db/schema'

const byName = (a: Deck, b: Deck) => a.name.localeCompare(b.name, 'ko')

export default function DecksPage() {
  const decks = useDecks()
  const toast = useToast()
  const [name, setName] = useState('')
  const [asMine, setAsMine] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  if (!decks) return null

  const mine = decks.filter((d) => d.isMine && !d.archived).sort(byName)
  const others = decks.filter((d) => !d.isMine && !d.archived).sort(byName)
  const archived = decks.filter((d) => d.archived).sort(byName)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await ensureDeck(name, { isMine: asMine })
      setName('')
    } catch (err) {
      toast({ message: (err as Error).message })
    }
  }

  return (
    <>
      <PageHeader title="덱" />
      <div className="space-y-6 px-4 pt-2">
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="덱 이름"
              aria-label="덱 이름"
              enterKeyHint="done"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-12 shrink-0 rounded-xl bg-accent px-5 font-bold text-accent-ink disabled:opacity-40"
            >
              추가
            </button>
          </div>
          <label className="flex h-10 items-center gap-2 text-[15px] text-ink-2">
            <input
              type="checkbox"
              className="size-5 accent-(--accent)"
              checked={asMine}
              onChange={(e) => setAsMine(e.target.checked)}
            />
            내 덱으로 추가
          </label>
        </form>

        <DeckSection title={`내 덱 ${mine.length}`} decks={mine} empty="대회에서 쓰는 덱을 추가하세요." />
        <DeckSection
          title={`상대 덱 ${others.length}`}
          decks={others}
          empty="라운드를 기록하면서 바로 추가할 수 있습니다."
        />

        {archived.length > 0 && (
          <section>
            <button
              type="button"
              className="h-12 text-[14px] font-medium text-ink-2 underline underline-offset-4"
              onClick={() => setShowArchived((v) => !v)}
            >
              숨긴 덱 {archived.length}개 {showArchived ? '접기' : '보기'}
            </button>
            {showArchived && <DeckSection title="" decks={archived} empty="" />}
          </section>
        )}
      </div>
    </>
  )
}

function DeckSection({ title, decks, empty }: { title: string; decks: Deck[]; empty: string }) {
  return (
    <section>
      {title && <h2 className={sectionTitleCls}>{title}</h2>}
      {decks.length === 0 ? (
        <p className="py-3 text-[14px] text-ink-2">{empty}</p>
      ) : (
        <ul className={`${cardCls} divide-y divide-line`}>
          {decks.map((d) => (
            <DeckRow key={d.id} deck={d} />
          ))}
        </ul>
      )}
    </section>
  )
}

function DeckRow({ deck }: { deck: Deck }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(deck.name)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await renameDeck(deck.id, name)
      setEditing(false)
    } catch (err) {
      toast({ message: (err as Error).message })
    }
  }

  if (editing) {
    return (
      <li className="p-2">
        <form onSubmit={save} className="flex gap-2">
          <input
            autoFocus
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="덱 이름 수정"
            enterKeyHint="done"
          />
          <button type="submit" className="h-12 shrink-0 rounded-xl bg-accent px-4 font-bold text-accent-ink">
            저장
          </button>
          <button
            type="button"
            className="h-12 shrink-0 rounded-xl px-3 text-ink-2"
            onClick={() => {
              setName(deck.name)
              setEditing(false)
            }}
          >
            취소
          </button>
        </form>
      </li>
    )
  }

  const rowBtn = 'h-12 shrink-0 rounded-lg px-2.5 text-[14px] font-medium text-ink-2 active:bg-surface-2'

  return (
    <li className="flex items-center gap-1 pl-4 pr-1">
      <button
        type="button"
        className="min-h-14 min-w-0 flex-1 truncate text-left text-[16px] font-medium"
        onClick={() => setEditing(true)}
        aria-label={`${deck.name} 이름 수정`}
      >
        {deck.name}
      </button>
      {deck.archived ? (
        <button type="button" className={rowBtn} onClick={() => void updateDeck(deck.id, { archived: false })}>
          복원
        </button>
      ) : (
        <>
          <button
            type="button"
            className={rowBtn}
            onClick={() => void updateDeck(deck.id, { isMine: !deck.isMine })}
          >
            {deck.isMine ? '내 덱 해제' : '내 덱으로'}
          </button>
          <button
            type="button"
            className={rowBtn}
            onClick={() => {
              void updateDeck(deck.id, { archived: true })
              toast({
                message: `'${deck.name}' 숨김`,
                actionLabel: '되돌리기',
                onAction: () => updateDeck(deck.id, { archived: false }),
              })
            }}
          >
            숨김
          </button>
        </>
      )}
    </li>
  )
}
