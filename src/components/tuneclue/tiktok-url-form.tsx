import { useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { setPendingRecognitionSource } from '@/lib/recognition/pending-source'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

export function TikTokUrlForm() {
  const navigate = useNavigate()
  const id = useId()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string>()

  async function submit() {
    setError(undefined)
    if (!tuneClueFlags.tiktok) {
      setError(
        'TikTok recognition is not live yet. This page remains noindex until the extractor gate passes.',
      )
      return
    }

    try {
      const parsed = new URL(url.trim())
      const allowed = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'].includes(
        parsed.hostname.toLowerCase(),
      )
      if (parsed.protocol !== 'https:' || !allowed) throw new Error()
      setPendingRecognitionSource({ kind: 'tiktok-url', url: parsed.toString() })
      await navigate({ to: '/identify' })
    } catch {
      setError('Paste a valid public TikTok video link.')
    }
  }

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: This page-level landmark is the stable target of the global Tools navigation link.
    <section className="mx-auto max-w-3xl rounded-2xl border bg-card p-4 shadow-sm" id="tool">
      <Field>
        <FieldLabel htmlFor={id}>TikTok video link</FieldLabel>
        <FieldControl>
          <input
            className="min-h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id={id}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.tiktok.com/@creator/video/..."
            type="url"
            value={url}
          />
          <FieldDescription>Public TikTok links only.</FieldDescription>
        </FieldControl>
      </Field>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex justify-end">
        <Button data-tool-primary-action onClick={submit} type="button">
          Find song
        </Button>
      </div>
    </section>
  )
}
