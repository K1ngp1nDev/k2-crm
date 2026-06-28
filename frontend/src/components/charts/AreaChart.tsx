import { useId } from 'react'

export interface AreaPoint {
  label: string
  value: number
}

interface AreaChartProps {
  data: AreaPoint[]
  height?: number
  formatValue?: (n: number) => string
}

function niceCeil(value: number): number {
  if (value <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Dependency-free responsive area + line chart drawn as inline SVG. */
export function AreaChart({ data, height = 240, formatValue = String }: AreaChartProps) {
  const gradientId = useId()
  const W = 760
  const H = height
  const padL = 52
  const padR = 16
  const padT = 16
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const max = niceCeil(Math.max(1, ...data.map((d) => d.value)))
  const n = data.length
  const x = (i: number) =>
    n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1)
  const y = (v: number) => padT + innerH - (innerH * v) / max
  const baseline = padT + innerH

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const areaPoints = `${x(0)},${baseline} ${linePoints} ${x(n - 1)},${baseline}`

  const gridSteps = 4
  const grid = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const v = (max / gridSteps) * i
    return { v, y: y(v) }
  })

  return (
    <svg
      className="chart-area"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Revenue by month"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c-line)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--c-line)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={padL}
            y1={g.y}
            x2={W - padR}
            y2={g.y}
            stroke="var(--c-grid)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={padL - 10}
            y={g.y + 4}
            textAnchor="end"
            className="chart-axis"
          >
            {formatValue(g.v)}
          </text>
        </g>
      ))}

      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--c-line)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {data.map((d, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(d.value)}
          r="3.5"
          fill="var(--surface)"
          stroke="var(--c-line)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {data.map((d, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="chart-axis">
          {d.label}
        </text>
      ))}
    </svg>
  )
}
