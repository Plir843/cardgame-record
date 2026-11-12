import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * 서비스 워커 등록 + 새 버전 안내.
 * 입력 도중에 화면이 갑자기 새로고침되지 않도록, 새 버전이 있어도 버튼을 눌러야 적용한다.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      <div
        role="status"
        className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-bg shadow-lg"
      >
        <span className="min-w-0 flex-1 text-[15px] font-medium">새 버전이 있습니다</span>
        <button
          type="button"
          className="h-11 shrink-0 rounded-xl bg-accent px-4 text-[15px] font-bold text-accent-ink active:opacity-80"
          onClick={() => void updateServiceWorker(true)}
        >
          업데이트
        </button>
      </div>
    </div>
  )
}
