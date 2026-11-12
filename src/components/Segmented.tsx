interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  /** lg 는 한 손 입력용 큰 버튼 */
  size?: 'md' | 'lg'
  label?: string
}

/** 둘 이상 중 하나를 고르는 나란한 버튼 묶음 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  label,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border font-semibold transition-colors ${
              size === 'lg' ? 'h-16 text-[18px]' : 'h-12 text-[15px]'
            } ${
              on
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-surface text-ink active:bg-surface-2'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
