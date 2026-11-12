import type { ReactNode } from 'react'

interface Props {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}

/** 한 번 탭으로 고르는 알약 모양 버튼 */
export function Chip({ selected = false, onClick, children, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-12 max-w-full truncate rounded-full border px-4 text-[15px] font-medium transition-colors ${
        selected
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-surface text-ink active:bg-surface-2'
      } ${className}`}
    >
      {children}
    </button>
  )
}
