import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

/** 화면 아래에서 올라오는 선택 창. 바깥을 누르면 닫힌다 */
export function Sheet({ title, description, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pb-safe relative w-full max-w-md rounded-t-3xl border-t border-line bg-bg px-4 pt-5"
      >
        <h2 className="text-[18px] font-bold">{title}</h2>
        {description && <p className="mt-1 text-[14px] text-ink-2">{description}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
