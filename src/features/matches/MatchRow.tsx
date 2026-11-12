import { Link } from 'react-router'
import { RESULT_LABEL, TURN_LABEL, type Match } from '../../db/schema'
import { matchLabel } from '../../domain/summary'

const RESULT_STYLE = {
  win: 'bg-win text-win-ink',
  bye: 'bg-win text-win-ink',
  loss: 'bg-loss text-loss-ink',
  draw: 'bg-draw text-white',
} as const

interface Props {
  match: Match
  /** 상대 덱 이름 */
  oppName: string
  /** 라운드 이름 대신 보여줄 글자 (단독 기록의 날짜 등) */
  label?: string
  /** 상대 덱 아래에 보여줄 보조 설명 */
  note?: string
}

/** 라운드 한 줄. 누르면 수정 화면으로 간다 */
export function MatchRow({ match, oppName, label, note }: Props) {
  const turn = match.turnOrder ? TURN_LABEL[match.turnOrder] : ''
  const meta = [match.matchFormat === 'bo3' ? 'Bo3' : '', turn, note].filter(Boolean).join(' · ')
  return (
    <Link to={`/match/${match.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-surface-2">
      <span className="w-11 shrink-0 text-[15px] font-bold tabular-nums text-ink-2">
        {label ?? matchLabel(match)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium">
          {match.result === 'bye' ? '부전승' : oppName}
        </span>
        {meta && <span className="block truncate text-[13px] text-ink-2">{meta}</span>}
      </span>
      <span
        className={`flex h-9 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-[15px] font-bold ${RESULT_STYLE[match.result]}`}
      >
        {match.result === 'bye' ? '승' : RESULT_LABEL[match.result]}
      </span>
    </Link>
  )
}
