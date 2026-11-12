import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface Props {
  title: string
  subtitle?: string
  /** 지정하면 왼쪽에 뒤로 가기 버튼이 생긴다 */
  backTo?: string
  right?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, right }: Props) {
  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 bg-bg/95 px-4 py-2 backdrop-blur">
      {backTo && (
        <Link
          to={backTo}
          replace
          aria-label="뒤로"
          className="-ml-3 flex size-12 shrink-0 items-center justify-center rounded-full active:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {subtitle && <p className="truncate text-[13px] text-ink-2">{subtitle}</p>}
        <h1 className="truncate text-[20px] font-bold leading-tight">{title}</h1>
      </div>
      {right}
    </header>
  )
}
