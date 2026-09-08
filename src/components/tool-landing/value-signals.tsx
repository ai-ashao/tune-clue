import { Check } from 'lucide-react'
import { deriveToolValueSignals } from '@/lib/tool-messaging'
import type { ToolExperience, ToolValueLabels } from './types'

export function ToolValueSignals({
  experience,
  labels,
  ariaLabel = 'Tool value signals',
}: Readonly<{
  experience: ToolExperience
  labels?: Partial<ToolValueLabels>
  ariaLabel?: string
}>) {
  const signals = deriveToolValueSignals(experience, labels)

  if (signals.length === 0) return null

  return (
    <ul
      aria-label={ariaLabel}
      className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground"
      data-tool-value-signals
    >
      {signals.map((signal) => (
        <li className="inline-flex items-center gap-1.5" key={signal.key}>
          <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.4} />
          <span>{signal.label}</span>
        </li>
      ))}
    </ul>
  )
}
