const pad = (n: number) => String(n).padStart(2, '0')

/** 오늘 날짜를 기기 현지 시간 기준 'YYYY-MM-DD' 로 반환 */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 'YYYY-MM-DD' → '11월 12일 (목)'. 올해가 아니면 연도를 붙인다 */
export function formatDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return s
  const date = new Date(y, m - 1, d)
  const base = `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`
  return y === new Date().getFullYear() ? base : `${y}년 ${base}`
}
