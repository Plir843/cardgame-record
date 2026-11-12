import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Sheet } from '../../components/Sheet'
import { cardCls, ghostBtnCls, inputCls, primaryBtnCls, sectionTitleCls } from '../../components/styles'
import { useToast } from '../../components/toast-context'
import {
  buildBackup,
  buildCsv,
  downloadText,
  importBackup,
  LAST_BACKUP_KEY,
  markBackedUp,
  parseBackup,
  type BackupFile,
} from '../../db/backup'
import { useEvents, useLossTags, useMatches, useSetting } from '../../db/hooks'
import { addLossTag, updateLossTag } from '../../db/repo'
import type { LossTag } from '../../db/schema'
import { todayStr } from '../../lib/date'

export default function SettingsPage() {
  const toast = useToast()
  const events = useEvents()
  const matches = useMatches()
  const lossTags = useLossTags()
  const lastBackupAt = useSetting<number>(LAST_BACKUP_KEY)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [tagName, setTagName] = useState('')

  // 브라우저가 저장 공간 부족 시 기록을 지우지 않도록 요청한다 (HTTPS 에서만 동작)
  useEffect(() => {
    const storage = navigator.storage
    if (!storage?.persist) return
    void storage.persisted().then(async (already) => {
      setPersisted(already || (await storage.persist()))
    })
  }, [])

  if (!events || !matches || !lossTags) return null

  const exportJson = async () => {
    const file = await buildBackup()
    downloadText(`전적백업-${todayStr()}.json`, JSON.stringify(file, null, 2), 'application/json')
    await markBackedUp()
    toast({ message: 'JSON 백업 파일을 저장했습니다', duration: 3000 })
  }

  const exportCsv = async () => {
    downloadText(`전적-${todayStr()}.csv`, await buildCsv(), 'text/csv;charset=utf-8')
    toast({ message: 'CSV 파일을 저장했습니다', duration: 3000 })
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
    } catch (err) {
      toast({ message: (err as Error).message })
    }
  }

  const confirmImport = async () => {
    if (!pending) return
    try {
      await importBackup(pending)
      toast({ message: '백업을 가져왔습니다', duration: 3000 })
    } catch {
      toast({ message: '가져오지 못했습니다. 기존 데이터는 그대로입니다' })
    }
    setPending(null)
  }

  const addTag = async (e: FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return
    await addLossTag(tagName)
    setTagName('')
  }

  const backupText = lastBackupAt
    ? `마지막 백업: ${new Date(lastBackupAt).toLocaleDateString('ko-KR')}`
    : '아직 백업한 적이 없습니다'

  return (
    <>
      <PageHeader title="설정" />
      <div className="space-y-7 px-4 pt-2">
        <section>
          <h2 className={sectionTitleCls}>데이터 백업</h2>
          <div className={`${cardCls} space-y-3 p-4`}>
            <p className="text-[15px]">
              대회 {events.length}개 · 경기 {matches.length}개
              <span className="mt-0.5 block text-[14px] text-ink-2">{backupText}</span>
            </p>
            <button type="button" className={`${primaryBtnCls} w-full`} onClick={() => void exportJson()}>
              JSON 으로 백업
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={ghostBtnCls} onClick={() => fileRef.current?.click()}>
                백업 가져오기
              </button>
              <button type="button" className={ghostBtnCls} onClick={() => void exportCsv()}>
                CSV 내보내기
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onFile(e)}
            />
            <p className="text-[13px] leading-relaxed text-ink-2">
              기록은 이 기기의 브라우저 안에만 저장됩니다. 브라우저 데이터를 지우거나 폰을 바꾸면 사라지므로
              가끔 JSON 으로 백업해 두세요. CSV 는 엑셀 확인용이며 다시 가져올 수 없습니다.
              {persisted === true && ' 이 기기에서는 저장 공간 보호가 켜져 있습니다.'}
            </p>
          </div>
        </section>

        <section>
          <h2 className={sectionTitleCls}>패배 원인 태그</h2>
          <form onSubmit={addTag} className="mb-2 flex gap-2">
            <input
              className={inputCls}
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="새 태그 이름"
              aria-label="새 태그 이름"
              enterKeyHint="done"
            />
            <button
              type="submit"
              disabled={!tagName.trim()}
              className="h-12 shrink-0 rounded-xl bg-accent px-5 font-bold text-accent-ink disabled:opacity-40"
            >
              추가
            </button>
          </form>
          <ul className={`${cardCls} divide-y divide-line`}>
            {lossTags.map((t) => (
              <TagRow key={t.id} tag={t} />
            ))}
          </ul>
        </section>

        <p className="pb-2 text-[13px] text-ink-2">전적 기록 v{__APP_VERSION__}</p>
      </div>

      {pending && (
        <Sheet
          title="백업 가져오기"
          description={`대회 ${pending.events.length}개, 경기 ${pending.matches.length}개, 덱 ${pending.decks.length}개가 들어 있습니다 (${new Date(pending.exportedAt).toLocaleDateString('ko-KR')} 백업).`}
          onClose={() => setPending(null)}
        >
          <p className="text-[15px] font-semibold text-loss">
            지금 이 기기에 있는 기록(대회 {events.length}개, 경기 {matches.length}개)은 모두 지워지고 백업
            내용으로 바뀝니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={`${ghostBtnCls} h-14`} onClick={() => setPending(null)}>
              취소
            </button>
            <button
              type="button"
              className="h-14 rounded-xl bg-loss font-bold text-loss-ink active:opacity-80"
              onClick={() => void confirmImport()}
            >
              바꾸기
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

function TagRow({ tag }: { tag: LossTag }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(tag.label)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await updateLossTag(tag.id, { label })
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-label="태그 이름 수정"
            enterKeyHint="done"
          />
          <button type="submit" className="h-12 shrink-0 rounded-xl bg-accent px-4 font-bold text-accent-ink">
            저장
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-1 pl-4 pr-1">
      <button
        type="button"
        className={`min-h-14 min-w-0 flex-1 truncate text-left text-[16px] font-medium ${tag.archived ? 'text-ink-2 line-through' : ''}`}
        onClick={() => setEditing(true)}
        aria-label={`${tag.label} 이름 수정`}
      >
        {tag.label}
      </button>
      <button
        type="button"
        className="h-12 shrink-0 rounded-lg px-3 text-[14px] font-medium text-ink-2 active:bg-surface-2"
        onClick={() => void updateLossTag(tag.id, { archived: !tag.archived })}
      >
        {tag.archived ? '다시 쓰기' : '숨김'}
      </button>
    </li>
  )
}
