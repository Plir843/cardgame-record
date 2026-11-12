import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

const TABS = [
  {
    to: '/',
    label: '대회',
    icon: icon(
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
        <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" />
      </>,
    ),
  },
  {
    to: '/stats',
    label: '통계',
    icon: icon(<path d="M5 20V11M12 20V4M19 20v-6" />),
  },
  {
    to: '/decks',
    label: '덱',
    icon: icon(
      <>
        <rect x="8" y="4" width="11" height="15" rx="2" />
        <path d="M5 8v10a2 2 0 0 0 2 2h8" />
      </>,
    ),
  },
  {
    to: '/settings',
    label: '설정',
    icon: icon(
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>,
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${
                isActive ? 'text-accent' : 'text-ink-2'
              }`
            }
          >
            {t.icon}
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
