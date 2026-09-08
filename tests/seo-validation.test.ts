import { describe, expect, it } from 'vitest'
import { auditSeoMetadata } from '@/lib/seo-validation'
import { site } from '@/lib/site'

const validInput = {
  title: 'Browser Image Resizer for Fast Local Exports',
  description:
    'Resize images locally in your browser with clear dimensions, predictable output, and no account or installation required.',
  path: '/image-resizer',
}

describe('SEO metadata audit', () => {
  it('treats missing core metadata and malformed site paths as errors', () => {
    const audit = auditSeoMetadata({ title: ' ', description: '', path: 'image-resizer?x=1' })

    expect(audit.errors.map((issue) => issue.code)).toEqual([
      'seo.title.required',
      'seo.description.required',
      'seo.path.invalid',
    ])

    expect(
      auditSeoMetadata({ ...validInput, path: '/%' }).errors.map((issue) => issue.code),
    ).toContain('seo.path.invalid')
  })

  it('keeps length guidance and duplicated hero copy advisory', () => {
    const audit = auditSeoMetadata({
      ...validInput,
      title: 'Image Resizer',
      description: 'Resize images locally.',
      heroDescription: 'Resize images locally.',
    })

    expect(audit.errors).toEqual([])
    expect(audit.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'seo.title.length',
        'seo.description.length',
        'seo.description.matches-hero',
      ]),
    )
  })

  it('warns when pageHead would append an already present brand', () => {
    const audit = auditSeoMetadata({ ...validInput, title: `${validInput.title} · ${site.name}` })
    expect(audit.warnings.map((issue) => issue.code)).toContain('seo.title.includes-brand')
  })

  it('accepts natural Latin keyword variants and warns on unrelated intent', () => {
    const matching = auditSeoMetadata({
      ...validInput,
      primaryKeyword: 'image resize tool',
      heroTitle: 'Resize Images in Your Browser',
    })
    expect(matching.warnings.map((issue) => issue.code)).not.toEqual(
      expect.arrayContaining([
        'seo.primary-keyword.title',
        'seo.primary-keyword.description',
        'seo.primary-keyword.hero',
      ]),
    )

    const unrelated = auditSeoMetadata({
      ...validInput,
      primaryKeyword: 'invoice generator',
      heroTitle: 'Resize Images',
    })
    expect(unrelated.errors).toEqual([])
    expect(unrelated.warnings.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'seo.primary-keyword.title',
        'seo.primary-keyword.description',
        'seo.primary-keyword.hero',
      ]),
    )
  })

  it('evaluates CJK keyword intent instead of silently passing it', () => {
    const matching = auditSeoMetadata({
      title: '免费在线图片压缩工具',
      description: '在线压缩 JPG、PNG 和 WebP 图片，减少文件大小，无需安装。',
      path: '/zh/image-compressor',
      primaryKeyword: '图片压缩工具',
      heroTitle: '图片压缩工具',
    })

    expect(matching.warnings.map((issue) => issue.code)).not.toContain(
      'seo.primary-keyword.manual-review',
    )
    expect(matching.warnings.map((issue) => issue.code)).not.toContain('seo.primary-keyword.title')

    const unrelated = auditSeoMetadata({
      title: '在线图片裁剪',
      description: '上传图片并调整裁剪区域。',
      path: '/zh/image-cropper',
      primaryKeyword: '图片压缩工具',
      heroTitle: '图片裁剪',
    })
    expect(unrelated.warnings.map((issue) => issue.code)).toContain('seo.primary-keyword.title')
  })

  it('requests manual review for unsupported non-Latin scripts', () => {
    const audit = auditSeoMetadata({
      ...validInput,
      primaryKeyword: 'генератор счетов',
      heroTitle: 'Invoice Generator',
    })
    expect(audit.warnings.map((issue) => issue.code)).toContain('seo.primary-keyword.manual-review')
  })

  it('warns about unsupported social image schemes', () => {
    const audit = auditSeoMetadata({ ...validInput, socialImage: 'data:image/png;base64,abc' })
    expect(audit.warnings.map((issue) => issue.code)).toContain('seo.social-image.invalid')

    const ambiguous = auditSeoMetadata({ ...validInput, socialImage: 'social/image.png' })
    expect(ambiguous.warnings.map((issue) => issue.code)).toContain('seo.social-image.invalid')
  })
})
