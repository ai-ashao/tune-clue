import { Check } from 'lucide-react'
import type { ToolCompletionConfig } from './types'

export function ToolCompletionSummary({
  completion,
  ariaLabel = 'Tool capabilities summary',
}: Readonly<{
  completion?: ToolCompletionConfig
  ariaLabel?: string
}>) {
  if (!completion?.highlights.length) return null

  return (
    <ul
      aria-label={ariaLabel}
      className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs font-medium text-foreground/80"
      data-tool-completion
    >
      {completion.highlights.slice(0, 5).map((highlight) => (
        <li className="inline-flex items-center gap-1.5" key={highlight}>
          <Check aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.4} />
          <span>{highlight}</span>
        </li>
      ))}
    </ul>
  )
}
