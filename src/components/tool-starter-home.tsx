import { useId, useState } from 'react'
import {
  type ToolLandingConfig,
  ToolLandingPage,
  ToolStructuredData,
} from '@/components/tool-landing'
import { Button } from '@/components/ui/button'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import type { Locale } from '@/i18n/config'
import { productHomeMessages } from '@/i18n/product-home-messages'
import { localizedPathOrDefault } from '@/i18n/routes'
import { site } from '@/lib/site'
import { primaryKeywordForLocale } from '@/lib/tool-seo-brief'
import { buildToolStructuredData } from '@/lib/tool-structured-data'
import { toolSeoBrief } from '@/modules/tool-seo-brief'

const toolSectionId = 'tool'

export function ToolStarterHome({ locale }: Readonly<{ locale: Locale }>) {
  const config = toolStarterConfig(locale)
  const structuredData = buildToolStructuredData(config, site)

  return (
    <div data-product-mode-home="tool">
      <ToolStructuredData items={structuredData} />
      <ToolLandingPage config={config} tool={<TextLengthChecker locale={locale} />} />
    </div>
  )
}

export function toolStarterConfig(locale: Locale): ToolLandingConfig {
  const copy = productHomeMessages[locale].tool
  const path = localizedPathOrDefault('home', locale)
  const primaryKeyword =
    primaryKeywordForLocale(toolSeoBrief, locale) ??
    (locale === 'zh-CN' ? '文本长度统计' : 'text length checker')

  return {
    version: '0.2',
    preset: 'tool-default',
    toolId: 'starter-home-tool',
    locale,
    seo: {
      primaryKeyword,
      title: productHomeMessages[locale].meta.toolTitle,
      description: productHomeMessages[locale].meta.toolDescription,
      path,
      indexable: true,
      applicationCategory: 'UtilitiesApplication',
    },
    hero: {
      eyebrow: copy.eyebrow,
      title: copy.title,
      description: copy.description,
    },
    experience: {
      free: true,
      online: true,
      installationRequired: false,
      signupRequired: false,
      processing: 'local',
    },
    constraints: {
      other: copy.constraints,
    },
    completion: {
      highlights: copy.completion,
    },
    capabilities: {
      title: copy.capabilitiesTitle,
      items: copy.capabilities.map(([id, title, description]) => ({
        id,
        title,
        description,
      })),
    },
    valueLabels: copy.valueLabels,
    faq: {
      title: copy.faqTitle,
      items: copy.faqs.map(([question, answer]) => ({ question, answer })),
    },
    structuredData: {
      enableFaq: true,
    },
  }
}

function TextLengthChecker({ locale }: Readonly<{ locale: Locale }>) {
  const copy = productHomeMessages[locale].tool
  const headingId = useId()
  const textId = useId()
  const [text, setText] = useState('')
  const [result, setResult] = useState({ characters: 0, words: 0 })

  function countText() {
    const trimmed = text.trim()
    setResult({
      characters: text.length,
      words: trimmed ? trimmed.split(/\s+/).length : 0,
    })
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto max-w-3xl rounded-2xl border bg-card p-4 shadow-sm"
      id={toolSectionId}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold" id={headingId}>
            {copy.toolHeading}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.toolDescription}</p>
        </div>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {result.characters} {copy.characters} · {result.words} {copy.words}
        </p>
      </div>

      <Field className="mt-4">
        <FieldLabel htmlFor={textId}>{copy.inputLabel}</FieldLabel>
        <FieldControl>
          <textarea
            className="min-h-24 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id={textId}
            onChange={(event) => setText(event.target.value)}
            placeholder={copy.placeholder}
            value={text}
          />
          <FieldDescription>{copy.inputDescription}</FieldDescription>
        </FieldControl>
      </Field>

      <div className="mt-4 flex justify-end">
        <Button data-tool-primary-action onClick={countText} type="button">
          {copy.action}
        </Button>
      </div>
    </section>
  )
}
