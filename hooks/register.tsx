import type { Register } from 'claude-code'

const RING = 2 * Math.PI * 15

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

// "2h 15m" / "3d 4h" until the ISO timestamp; '' when unknown.
const until = (iso?: string) => {
  if (!iso) return ''
  const min = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 60000))
  if (Number.isNaN(min)) return ''
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

// Ring colour: a continuous green -> amber -> red scale (hue 120 -> 45 -> 0).
// Green at 0%, amber exactly at `warn`, red from `critical` upward.
const colorFor = (p: number, warn: number, critical: number) => {
  const hue = p <= warn
    ? 120 - (p / warn) * 75
    : p < critical
      ? 45 - ((p - warn) / (critical - warn)) * 45
      : 0
  return `hsl(${hue.toFixed(0)}, 75%, 48%)`
}

const ring = (label: string, percent: number, warn: number, critical: number, resetsAt?: string) => {
  const p = clamp(percent)
  const dash = (p / 100) * RING
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="40" height="40">` +
    `<circle cx="18" cy="18" r="15" fill="none" stroke="#888888" stroke-opacity="0.3" stroke-width="3"/>` +
    `<circle cx="18" cy="18" r="15" fill="none" stroke="${colorFor(p, warn, critical)}" stroke-width="3" stroke-linecap="round" ` +
    `stroke-dasharray="${dash.toFixed(2)} ${RING.toFixed(2)}" transform="rotate(-90 18 18)"/>` +
    `<text x="18" y="21" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#888888">${p}%</text>` +
    `</svg>`
  const left = until(resetsAt)
  return { label, percent: p, source, reset: left ? `reinicia en ${left}` : '' }
}

export const register: Register = (on, options) => {
  // Thresholds from userConfig; keep warn < critical whatever was typed.
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const warn = Math.max(1, Math.min(98, num(options.warnAt, 70)))
  const critical = Math.max(warn + 1, Math.min(100, num(options.criticalAt, 90)))

  // Meters that sit at or above the red threshold; a toast fires only when one
  // enters this set, and it re-arms once the meter drops back under.
  const inRed = new Set<string>()

  // The engine pushes a measure after each turn and when a limit window moves:
  // warn on crossing the red threshold, and redraw so the rings follow.
  on('session.measure', ($, e, next) => {
    const readings: [string, number][] = [
      ['context', e.context.percent ?? 0],
      ['5h', e.rateLimits.find(r => r.kind === 'five_hour')?.percentUsed ?? 0],
      ['7d', e.rateLimits.find(r => r.kind === 'seven_day')?.percentUsed ?? 0],
    ]
    for (const [label, value] of readings) {
      const p = clamp(value)
      if (p >= critical) {
        if (!inRed.has(label)) {
          inRed.add(label)
          $.ui.toast(`${label} al ${p}%: superó el umbral rojo (${critical}%)`)
        }
      } else {
        inRed.delete(label)
      }
    }
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const usage = await $.session.usage()
    const find = (kind: string) => usage.rateLimits.find(r => r.kind === kind)

    const meters = [
      ring('context', usage.context.percent ?? 0, warn, critical),
      ring('5h', find('five_hour')?.percentUsed ?? 0, warn, critical, find('five_hour')?.resetsAt),
      ring('7d', find('seven_day')?.percentUsed ?? 0, warn, critical, find('seven_day')?.resetsAt),
    ]

    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    const Svg = 'Svg' in table ? table.Svg : undefined

    const compact = (
      <Button
        key="compact"
        label="Compact"
        onPress={() => {
          void $.command.run({ command: 'compact' })
        }}
      />
    )

    if (!Svg) {
      // Terminal: no vector drawing, so the rings become text readouts.
      return (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={1}>
          <Text>
            {meters.map(m => `${m.label} ${m.percent}%${m.reset ? ` (${m.reset})` : ''}`).join('   ')}
          </Text>
          {compact}
        </Box>
      )
    }

    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={1} gap={2}>
        <Box flexDirection="row" alignItems="center" justifyContent="space-evenly" flexGrow={1} gap={2}>
          {meters.map(m => (
            <Box key={m.label} flexDirection="row" alignItems="center" gap={1}>
              <Svg source={m.source} alt={`${m.label} ${m.percent}%`} width={40} height={40} />
              <Box flexDirection="column">
                <Text>{m.label}</Text>
                {m.reset ? <Text dimColor>{m.reset}</Text> : null}
              </Box>
            </Box>
          ))}
        </Box>
        {compact}
      </Box>
    )
  })
}
