import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, FileAudio2, Link2, LockKeyhole, UploadCloud } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { setPendingRecognitionSource } from '@/lib/recognition/pending-source'
import { tuneClueFlags } from '@/lib/tuneclue-flags'

type SourceMode = 'upload' | 'tiktok'
const MAX_FILE_BYTES = 40 * 1024 * 1024

export function TuneClueSourceTool() {
  const navigate = useNavigate()
  const inputId = useId()
  const urlId = useId()
  const [mode, setMode] = useState<SourceMode>(tuneClueFlags.tiktok ? 'tiktok' : 'upload')
  const [file, setFile] = useState<File>()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const tiktokAvailable = tuneClueFlags.tiktok

  useEffect(() => setMounted(true), [])

  function chooseMode(next: SourceMode) {
    setMode(next)
    setError(undefined)
  }

  function acceptFile(nextFile?: File) {
    setDragging(false)
    setError(undefined)
    if (!nextFile) return
    if (nextFile.size > MAX_FILE_BYTES) {
      setFile(undefined)
      setError('Choose a file smaller than 40 MB.')
      return
    }
    setFile(nextFile)
    setPendingRecognitionSource({ kind: 'local-file', file: nextFile })
    void navigate({ to: '/identify' })
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
    // biome-ignore lint/correctness/useUniqueElementIds: stable global Tools anchor.
    <section
      className="tc-source-card mx-auto max-w-3xl"
      data-mounted={mounted ? 'true' : 'false'}
      id="tool"
    >
      {tiktokAvailable ? (
        <div className="tc-mode-tabs" role="tablist">
          <button
            aria-selected={effectiveMode === 'tiktok'}
            className="tc-mode-tab"
            onClick={() => chooseMode('tiktok')}
            role="tab"
            type="button"
          >
            <Link2 aria-hidden="true" size={15} />
            Paste link
          </button>
          <button
            aria-selected={effectiveMode === 'upload'}
            className="tc-mode-tab"
            onClick={() => chooseMode('upload')}
            role="tab"
            type="button"
          >
            <UploadCloud aria-hidden="true" size={15} />
            Upload file
          </button>
        </div>
      ) : null}

      {effectiveMode === 'upload' ? (
        <div className={tiktokAvailable ? 'mt-3' : undefined}>
          <input
            accept="audio/*,video/mp4,video/webm"
            className="sr-only"
            id={inputId}
            onChange={(event) => acceptFile(event.currentTarget.files?.[0])}
            type="file"
          />
          <label
            className={`tc-dropzone${dragging ? ' is-dragging' : ''}`}
            htmlFor={inputId}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragging(false)
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              acceptFile(event.dataTransfer.files[0])
            }}
          >
            <span>
              <span className="tc-dropzone-icon">
                <UploadCloud aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <span className="tc-dropzone-title">
                {file ? 'Choose a different clip' : 'Upload a video or audio clip'}
              </span>
              <span className="tc-dropzone-copy">
                Drop a file here, or choose one from your device.
              </span>
              <span className="tc-choose-file">Choose file</span>
              <span className="tc-file-rules">
                MP3, WAV, M4A, MP4 or WebM · Max file size 40 MB
              </span>
            </span>
          </label>

          {file ? (
            <div className="tc-file-chip">
              <FileAudio2 aria-hidden="true" size={15} />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span>{formatBytes(file.size)}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="tc-link-panel">
          <div className="tc-link-inner">
            <span className="tc-link-icon">
              <Link2 aria-hidden="true" size={23} />
            </span>
            <h2 className="tc-link-title">Paste a TikTok video link</h2>
            <p className="tc-link-copy">
              Use a public TikTok URL and TuneClue will identify the music from it.
            </p>
            <div className="tc-link-field">
              <label className="sr-only" htmlFor={urlId}>
                TikTok video link
              </label>
              <Link2 aria-hidden="true" size={16} />
              <input
                id={urlId}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.tiktok.com/@creator/video/..."
                type="url"
                value={url}
              />
              <Button
                className="tc-link-action"
                data-tool-primary-action
                onClick={continueToIdentify}
                type="button"
              >
                Find song
                <ArrowRight aria-hidden="true" size={15} />
              </Button>
            </div>
            <p className="tc-link-hint">Public TikTok links only.</p>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {effectiveMode === 'upload' ? (
        <div className="tc-source-footer">
          <p className="tc-trust-note">
            <LockKeyhole aria-hidden="true" size={13} />
            Full local files stay in your browser. Only a short audio sample is sent.
          </p>
          <Button
            className="tc-primary-action"
            data-tool-primary-action
            onClick={continueToIdentify}
            type="button"
          >
            Find song
            <ArrowRight aria-hidden="true" size={15} />
          </Button>
        </div>
      ) : null}
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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
