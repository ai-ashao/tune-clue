import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { setPendingRecognitionSource } from '@/lib/recognition/pending-source'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

type SourceMode = 'upload' | 'tiktok'

export function TuneClueSourceTool() {
  const navigate = useNavigate()
  const inputId = useId()
  const urlId = useId()
  const [mode, setMode] = useState<SourceMode>('upload')
  const [file, setFile] = useState<File>()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string>()
  const [mounted, setMounted] = useState(false)
  const tiktokAvailable = tuneClueFlags.tiktok

  useEffect(() => setMounted(true), [])

  function chooseMode(next: SourceMode) {
    setMode(next)
    setError(undefined)
  }

  async function continueToIdentify() {
    setError(undefined)

    if (mode === 'upload' || !tiktokAvailable) {
      if (!file) {
        setError('Choose a local audio or video clip first.')
        return
      }
      setPendingRecognitionSource({ kind: 'local-file', file })
      await navigate({ to: '/identify' })
      return
    }

    const normalized = normalizeTikTokUrl(url)
    if (!normalized) {
      setError('Paste a valid public TikTok video link.')
      return
    }

    setPendingRecognitionSource({ kind: 'tiktok-url', url: normalized })
    await navigate({ to: '/identify' })
  }

  const effectiveMode: SourceMode = tiktokAvailable ? mode : 'upload'

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: This page-level landmark is the stable target of the global Tools navigation link.
    <section
      className="mx-auto max-w-3xl rounded-2xl border bg-card p-4 shadow-sm"
      data-mounted={mounted ? 'true' : 'false'}
      id="tool"
    >
      {tiktokAvailable ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
          <button
            aria-selected={effectiveMode === 'upload'}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              effectiveMode === 'upload' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => chooseMode('upload')}
            role="tab"
            type="button"
          >
            Upload file
          </button>
          <button
            aria-selected={effectiveMode === 'tiktok'}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              effectiveMode === 'tiktok' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => chooseMode('tiktok')}
            role="tab"
            type="button"
          >
            TikTok link
          </button>
        </div>
      ) : null}

      {effectiveMode === 'upload' ? (
        <Field className={tiktokAvailable ? 'mt-4' : undefined}>
          <FieldLabel htmlFor={inputId}>Audio or video clip</FieldLabel>
          <FieldControl>
            <input
              accept="audio/*,video/mp4,video/webm"
              className="block w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              id={inputId}
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
              type="file"
            />
            <FieldDescription>
              The original file stays in your browser. TuneClue sends only a short audio sample for
              recognition.
            </FieldDescription>
          </FieldControl>
        </Field>
      ) : (
        <Field className="mt-4">
          <FieldLabel htmlFor={urlId}>TikTok video link</FieldLabel>
          <FieldControl>
            <input
              className="min-h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id={urlId}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@creator/video/..."
              type="url"
              value={url}
            />
            <FieldDescription>Public TikTok videos only.</FieldDescription>
          </FieldControl>
        </Field>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button data-tool-primary-action onClick={continueToIdentify} type="button">
          Find song
        </Button>
      </div>
    </section>
  )
}

function normalizeTikTokUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return undefined
    const host = url.hostname.toLowerCase()
    const allowed =
      host === 'www.tiktok.com' ||
      host === 'tiktok.com' ||
      host === 'vm.tiktok.com' ||
      host === 'vt.tiktok.com'
    if (!allowed) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}
