import { useEffect, useRef, useState } from 'react'

// Daily card views: one series, so one hue and no legend (the title names it).
export default function ViewsChart({ data, title = 'Card views, last 30 days' }) {
  const [hover, setHover] = useState(null)
  const [W, setW] = useState(600)
  const wrap = useRef(null)
  // Draw at the real pixel width so text and bars are never stretched.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])
  if (!data) return <div className="panel chart-panel"><div className="bc-skeleton chart-skeleton" /></div>
  const total = data.reduce((s, d) => s + Number(d.views), 0)
  const max = Math.max(1, ...data.map((d) => Number(d.views)))
  const nice = max <= 4 ? 4 : Math.ceil(max / 4) * 4
  const H = 180
  const pad = { l: 28, r: 4, t: 8, b: 22 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const step = iw / data.length
  const bw = Math.max(2, step - 2)
  const y = (v) => pad.t + ih - (v / nice) * ih
  const label = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const h = hover != null ? data[hover] : null

  return (
    <div className="panel chart-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="chart-total">{total.toLocaleString()} total</span>
      </div>
      <div className="chart-wrap" ref={wrap} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${total} views`}>
          {[0, nice / 2, nice].map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="chart-grid" />
              <text x={pad.l - 6} y={y(g) + 4} className="chart-axis" textAnchor="end">{g}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const v = Number(d.views)
            const x = pad.l + i * step + 1
            const top = y(v)
            const bh = pad.t + ih - top
            const r = Math.min(4, bw / 2, bh)
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${label(d.day)}: ${v} views`}>
                <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
                {v > 0 && (
                  <path
                    className={`chart-bar ${hover === i ? 'on' : ''}`}
                    d={`M${x},${pad.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.t + ih} Z`}
                  />
                )}
              </g>
            )
          })}
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="chart-base" />
          {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
            <text key={i} x={pad.l + i * step + step / 2} y={H - 4} className="chart-axis" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
              {label(data[i].day)}
            </text>
          ))}
        </svg>
        {h && (
          <div className="chart-tip" style={{ left: `${((pad.l + hover * step + step / 2) / W) * 100}%` }}>
            <b>{Number(h.views).toLocaleString()}</b> views
            <span>{label(h.day)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
