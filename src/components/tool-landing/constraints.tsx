import { deriveToolConstraintItems } from '@/lib/tool-constraints'
import type { ToolConstraints } from './types'

export function ToolConstraintsSummary({
  constraints,
  ariaLabel = 'Tool constraints',
}: Readonly<{
  constraints?: ToolConstraints
  ariaLabel?: string
}>) {
  if (!constraints) return null

  const items = deriveToolConstraintItems(constraints)
  if (items.length === 0) return null

  return (
    <ul
      aria-label={ariaLabel}
      className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground"
      data-tool-constraints
    >
      {items.map((item) => (
        <li className="inline-flex items-center gap-3" key={item}>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
