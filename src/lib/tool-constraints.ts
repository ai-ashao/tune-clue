import type { ToolConstraintLabels, ToolConstraints } from '@/components/tool-landing/types'

export const defaultToolConstraintLabels: ToolConstraintLabels = {
  outputPrefix: 'Output',
  maxFileSizePrefix: 'Max',
  maxFilesPrefix: 'Up to',
  filesSuffix: 'files',
}

export function deriveToolConstraintItems(constraints: ToolConstraints): ReadonlyArray<string> {
  const labels = { ...defaultToolConstraintLabels, ...constraints.labels }
  const items: string[] = []

  if (constraints.acceptedFormats?.length) {
    items.push(constraints.acceptedFormats.join(' · '))
  }

  if (constraints.outputFormats?.length) {
    items.push(`${labels.outputPrefix}: ${constraints.outputFormats.join(' / ')}`)
  }

  if (constraints.maxFileSize) {
    items.push(`${labels.maxFileSizePrefix} ${constraints.maxFileSize}`)
  }

  if (typeof constraints.maxFiles === 'number') {
    items.push(`${labels.maxFilesPrefix} ${constraints.maxFiles} ${labels.filesSuffix}`)
  }

  if (constraints.dimensions) {
    items.push(constraints.dimensions)
  }

  if (constraints.other?.length) {
    items.push(...constraints.other)
  }

  return items
}
