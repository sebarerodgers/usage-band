import { expect, test } from 'claude-code/testing'

test('Compact submits /compact, on every surface', async ($, on) => {
  const sent: string[] = []

  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { window: 200000, tokens: 50000, percent: 25 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 10 },
        { kind: 'seven_day', percentUsed: 40 },
      ],
    },
  }))
  on('command.run', (_, e) => {
    sent.push(`/${e.command}`)
    return {} as never
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    sent.length = 0
    const ui = await $.ui.mount({
      plugin: 'usage-band',
      component: 'AbovePrompt',
      surface,
      props: { hasSurvey: false },
    } as never)

    await ui.press({ key: 'compact' })
    expect(sent).toEqual(['/compact'])
    await ui.unmount()
  }
})

test('thresholds come from userConfig', { options: { warnAt: 50, criticalAt: 60 } }, async ($, on) => {
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { window: 200000, tokens: 1, percent: 65 },
      rateLimits: [],
    },
  }))
  const ui = await $.ui.mount({
    plugin: 'usage-band', component: 'AbovePrompt', surface: 'desktop', props: { hasSurvey: false },
  } as never)
  const svg = await ui.find({ type: "Svg" }); expect(JSON.stringify(svg)).toContain("hsl(0,")
  await ui.unmount()
})

test('a toast fires once when a meter crosses the red threshold', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } as never })
  on('ui.invalidate', () => ({ value: undefined }) as never)
  on('session.measure', (_, e) => ({ changed: e.changed }))

  const measure = (context: number, five: number) =>
    $.session.measure({
      context: { window: 200000, tokens: 1, percent: context },
      rateLimits: [{ kind: 'five_hour', percentUsed: five }],
      changed: ['context'],
    } as never)

  await measure(50, 10)
  expect(toasts).toEqual([])
  await measure(95, 10)
  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('context')
  await measure(96, 10) // still red: no repeat
  expect(toasts.length).toBe(1)
  await measure(40, 10) // drops: re-arms
  await measure(91, 92)
  expect(toasts.length).toBe(3)
})
