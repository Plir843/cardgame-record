import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { inputCls, primaryBtnCls, sectionTitleCls } from '../../components/styles'
import { useToast } from '../../components/toast-context'
import { useDecks, useEvents } from '../../db/hooks'
import { createEvent, updateEvent } from '../../db/repo'
import type { Deck, EventRecord, ID } from '../../db/schema'
import { todayStr } from '../../lib/date'
import { MyDeckSelect } from '../decks/MyDeckSelect'

export default function EventFormPage() {
  const { eventId } = useParams()
  const events = useEvents()
  const decks = useDecks()
  if (!events || !decks) return null
  const existing = eventId ? events.find((e) => e.id === eventId) : undefined
  if (eventId && !existing) return <Navigate to="/" replace />
  return <EventForm key={eventId ?? 'new'} existing={existing} events={events} decks={decks} />
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]

function EventForm({
  existing,
  events,
  decks,
}: {
  existing?: EventRecord
  events: EventRecord[]
  decks: Deck[]
}) {
  const navigate = useNavigate()
  const toast = useToast()
  // 새 대회는 직전 대회의 매장·포맷·덱을 미리 채워 입력을 줄인다
  const [last] = useState(() => [...events].sort((a, b) => b.createdAt - a.createdAt)[0])
  const seed = existing ?? last

  const [name, setName] = useState(existing?.name ?? '')
  const [date, setDate] = useState(existing?.date ?? todayStr())
  const [store, setStore] = useState(seed?.store ?? '')
  const [format, setFormat] = useState(seed?.format ?? '')
  const [myDeckId, setMyDeckId] = useState<ID | null>(() => {
    const id = seed?.myDeckId
    if (!id) return null
    const deck = decks.find((d) => d.id === id)
    // 새 대회인데 직전 덱이 숨김 상태면 선택하지 않는다
    return deck && (existing || !deck.archived) ? id : null
  })
  const [saving, setSaving] = useState(false)

  const autoName = store.trim() ? `${store.trim()} 대회` : `${date} 대회`
  const backTo = existing ? `/events/${existing.id}` : '/'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!myDeckId || saving) return
    setSaving(true)
    const input = { name: name.trim() || autoName, date, store, format, myDeckId }
    try {
      if (existing) {
        await updateEvent(existing.id, input)
        navigate(backTo, { replace: true })
      } else {
        const created = await createEvent(input)
        navigate(`/events/${created.id}`, { replace: true })
      }
    } catch (err) {
      setSaving(false)
      toast({ message: `저장하지 못했습니다: ${(err as Error).message}` })
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md pb-32">
      <PageHeader title={existing ? '대회 수정' : '새 대회'} backTo={backTo} />
      <div className="space-y-5 px-4 pt-2">
        <section>
          <h2 className={sectionTitleCls}>사용 덱</h2>
          <MyDeckSelect decks={decks} value={myDeckId} onChange={setMyDeckId} />
        </section>

        <label className="block">
          <span className={`${sectionTitleCls} block`}>날짜</span>
          <input
            type="date"
            className={inputCls}
            value={date}
            onChange={(e) => setDate(e.target.value || todayStr())}
          />
        </label>

        <label className="block">
          <span className={`${sectionTitleCls} block`}>매장</span>
          <input
            className={inputCls}
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="예: ○○카드샵"
            list="store-list"
          />
          <datalist id="store-list">
            {unique(events.map((ev) => ev.store)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className={`${sectionTitleCls} block`}>포맷</span>
          <input
            className={inputCls}
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            placeholder="예: BT23"
            list="format-list"
          />
          <datalist id="format-list">
            {unique(events.map((ev) => ev.format)).map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className={`${sectionTitleCls} block`}>대회 이름 (비우면 자동)</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={autoName}
          />
        </label>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pt-3">
          <button type="submit" disabled={!myDeckId || saving} className={`${primaryBtnCls} w-full`}>
            {existing ? '저장' : myDeckId ? '대회 시작' : '사용 덱을 고르세요'}
          </button>
        </div>
      </div>
    </form>
  )
}
