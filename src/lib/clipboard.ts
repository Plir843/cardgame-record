/** 텍스트를 클립보드에 복사. 성공 여부를 반환한다 */
export async function copyText(text: string): Promise<boolean> {
  try {
    // HTTPS/localhost 에서만 제공되는 API
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 아래 대체 방식으로 넘어간다
  }
  // http 접속(개발 중 Wi-Fi 확인)용 대체 방식
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  ta.remove()
  return ok
}
