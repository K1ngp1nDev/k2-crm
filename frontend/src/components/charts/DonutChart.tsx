export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  centerValue: string | number
  centerLabel: string
}

/** Dependency-free donut chart with a legend, drawn with SVG stroke arcs. */
export function DonutChart({ data, centerValue, centerLabel }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = 56
  const stroke = 22
  const circumference = 2 * Math.PI * radius

  let acc = 0
  const arcs = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0
    const length = fraction * circumference
    const arc = {
      color: d.color,
      dash: `${length} ${circumference - length}`,
      offset: -acc * circumference,
    }
    acc += fraction
    return arc
  })

  return (
    <div className="donut">
      <div className="donut__chart">
        <svg viewBox="0 0 160 160" role="img" aria-label={centerLabel}>
          <g transform="rotate(-90 80 80)">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--c-grid)"
              strokeWidth={stroke}
            />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                strokeLinecap="butt"
              />
            ))}
          </g>
          <text x="80" y="74" textAnchor="middle" className="donut__value">
            {centerValue}
          </text>
          <text x="80" y="94" textAnchor="middle" className="donut__label">
            {centerLabel}
          </text>
        </svg>
      </div>

      <ul className="donut__legend">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
          return (
            <li key={d.label} className="donut__legend-item">
              <span className="donut__dot" style={{ background: d.color }} />
              <span className="donut__legend-label">{d.label}</span>
              <span className="donut__legend-value mono">
                {d.value} <span className="muted">· {pct}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
