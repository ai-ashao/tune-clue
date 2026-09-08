import { describe, expect, it } from 'vitest'
import { deriveToolConstraintItems } from '@/lib/tool-constraints'

describe('tool constraints', () => {
  it('turns typed constraints into compact visible task guidance', () => {
    expect(
      deriveToolConstraintItems({
        acceptedFormats: ['JPG', 'PNG', 'WebP'],
        outputFormats: ['JPG', 'PNG'],
        maxFileSize: '20 MB',
        maxFiles: 20,
        dimensions: '1280×720 recommended',
        other: ['16:9 supported'],
      }),
    ).toEqual([
      'JPG · PNG · WebP',
      'Output: JPG / PNG',
      'Max 20 MB',
      'Up to 20 files',
      '1280×720 recommended',
      '16:9 supported',
    ])
  })

  it('supports localized constraint labels without changing the data model', () => {
    expect(
      deriveToolConstraintItems({
        maxFileSize: '20 MB',
        maxFiles: 10,
        labels: {
          maxFileSizePrefix: '最大',
          maxFilesPrefix: '最多',
          filesSuffix: '个文件',
        },
      }),
    ).toEqual(['最大 20 MB', '最多 10 个文件'])
  })
})
