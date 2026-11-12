// 승/패/무 집계의 공통 도구 (순수 함수)

export interface Tally {
  win: number
  loss: number
  draw: number
}

export const emptyTally = (): Tally => ({ win: 0, loss: 0, draw: 0 })

export const totalOf = (t: Tally) => t.win + t.loss + t.draw

/** 승률(0~1). 판수가 없으면 null. 무승부는 판수에 포함하고 승으로 세지 않는다 */
export const rateOf = (t: Tally): number | null => {
  const total = totalOf(t)
  return total === 0 ? null : t.win / total
}

export const percentText = (t: Tally): string => {
  const r = rateOf(t)
  return r === null ? '-' : `${Math.round(r * 100)}%`
}

/** '3승 1패' (무승부가 있으면 '3승 1패 1무') */
export const recordText = (t: Tally): string =>
  `${t.win}승 ${t.loss}패${t.draw > 0 ? ` ${t.draw}무` : ''}`

/** '3-1' (무승부가 있으면 '3-1-1') */
export const recordShort = (t: Tally): string =>
  `${t.win}-${t.loss}${t.draw > 0 ? `-${t.draw}` : ''}`
