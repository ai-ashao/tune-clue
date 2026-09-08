import { createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { ToolLandingPage, ToolStructuredData } from '@/components/tool-landing'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { site } from '@/lib/site'
import { toolPageHead } from '@/lib/tool-seo'
import { buildToolStructuredData } from '@/lib/tool-structured-data'
import { toolReferenceConfig as config } from '@/modules/tool-reference-configs'

export const Route = createFileRoute('/tool-reference')({
  head: () => toolPageHead(config),
  component: ToolReferencePage,
})

function ToolReferencePage() {
  const structuredData = buildToolStructuredData(config, site)
  return (
    <>
      <ToolStructuredData items={structuredData} />
      <ToolLandingPage config={config} tool={<TextLengthChecker />} />
    </>
  )
}

function TextLengthChecker() {
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
      data-reference-tool
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold" id={headingId}>
            Check text length
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Paste text below. The reference tool does not submit it anywhere.
          </p>
        </div>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {result.characters} characters · {result.words} words
        </p>
      </div>

      <Field className="mt-2">
        <FieldLabel htmlFor={textId}>Text</FieldLabel>
        <textarea
          className="min-h-20 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          id={textId}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type or paste text here"
          value={text}
        />
      </Field>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Everything runs in this browser tab.</p>
        <Button data-tool-primary-action onClick={countText} type="button">
          Count text
        </Button>
      </div>
    </section>
  )
}
