import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  /** 되돌리기 같은 동작 버튼 */
  actionLabel?: string
  onAction?: () => void | Promise<void>
  /** 표시 시간(ms). 기본 5초 */
  duration?: number
}

export const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

/** 화면 아래에 잠깐 뜨는 알림을 띄운다 */
export const useToast = () => useContext(ToastContext)
