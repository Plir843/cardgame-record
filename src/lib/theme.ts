// 화면 테마: 시스템(폰 설정 따라감) / 라이트 / 다크
// 첫 화면이 번쩍이지 않도록 IndexedDB 가 아닌 localStorage 에 저장하고,
// index.html 의 인라인 스크립트가 앱보다 먼저 같은 규칙으로 적용한다.

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'theme'
/** 폰 상단 상태 표시줄 색 (index.css 의 --bg 와 같은 값) */
const BAR_COLOR = { light: '#f4f5f7', dark: '#101216' } as const

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // 저장소를 못 쓰는 환경이면 이번 실행에만 적용한다
  }
  applyTheme(theme)
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  // theme-color 메타는 라이트/다크용 두 개가 media 로 나뉘어 있다.
  // 시스템이면 원래 값으로, 직접 고르면 둘 다 고른 색으로 맞춘다.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const isDarkMeta = meta.media.includes('dark')
    const mode = theme === 'system' ? (isDarkMeta ? 'dark' : 'light') : theme
    meta.content = BAR_COLOR[mode]
  }
}
