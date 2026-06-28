export interface BarItem {
  label: string
  value: number
  sub?: string
}

interface BarListProps {
  data: BarItem[]
  formatValue?: (n: number) => string
  color?: string
}

/** Horizontal ranked bar list (HTML/CSS) — used for "top products". */
export function BarList({
  data,
  formatValue = String,
  color = 'var(--c-line)',
}: BarListProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="barlist">
      {data.map((d) => (
        <div className="barlist__row" key={d.label}>
          <div className="barlist__head">
            <span className="barlist__label" title={d.label}>
              {d.label}
            </span>
            <span className="barlist__value mono">{formatValue(d.value)}</span>
          </div>
          <div className="barlist__track">
            <div
              className="barlist__fill"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          {d.sub && <span className="barlist__sub muted small">{d.sub}</span>}
        </div>
      ))}
    </div>
  )
}
