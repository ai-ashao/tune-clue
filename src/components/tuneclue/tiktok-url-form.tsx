import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Link2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { setPendingRecognitionSource } from '@/lib/recognition/pending-source'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

export function TikTokUrlForm() {
  const navigate = useNavigate()
  const id = useId()
  const errorId = `${id}-error`
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string>()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  async function submit() {
    setError(undefined)
    if (!tuneClueFlags.tiktok) {
      setError('TikTok link recognition is not available yet.')
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
    <section
      className="tc-source-card tc-tiktok-source-card"
      data-mounted={mounted ? 'true' : 'false'}
      id="tool"
    >
      <div className="tc-link-panel">
        <form
          className="tc-link-inner"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <span className="tc-link-icon">
            <Link2 aria-hidden="true" size={23} />
          </span>
          <h2 className="tc-link-title">Paste a TikTok video link</h2>
          <p className="tc-link-copy">
            Use a public TikTok URL and TuneClue will identify the music from it.
          </p>
          <div className="tc-link-field">
            <label className="sr-only" htmlFor={id}>
              TikTok video link
            </label>
            <Link2 aria-hidden="true" size={16} />
            <input
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
              id={id}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@creator/video/..."
              type="url"
              value={url}
            />
            <Button className="tc-link-action" data-tool-primary-action type="submit">
              Find song
              <ArrowRight aria-hidden="true" size={15} />
            </Button>
          </div>
          <p className="tc-link-hint">Public TikTok links only.</p>
          {error ? (
            <p className="tc-link-error" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  )
}
