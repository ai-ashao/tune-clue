import { Copy, Sparkles } from 'lucide-react'
import type { RecognitionResult as Result } from '@/lib/recognition/types'

export function RecognitionResult({
  result,
  remainingCredits,
}: Readonly<{ result: Result; remainingCredits: number }>) {
  if (result.status === 'no-match') {
    return (
      <div className="tc-result-card">
        <p className="tc-result-label">No match</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">No song match found</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Try another point in the clip where the music is clearer.
        </p>
        <CreditFooter remainingCredits={remainingCredits} />
      </div>
    )
  }

  const links = [
    ['Spotify', result.links.spotify],
    ['Apple Music', result.links.appleMusic],
    ['Deezer', result.links.deezer],
    ['Song link', result.links.songLink],
  ].filter((item): item is [string, string] => Boolean(item[1]))

  return (
    <section className="tc-result-card" aria-live="polite">
      <div className="flex items-start gap-4">
        {result.artworkUrl ? (
          <div className="tc-result-art">
            <img alt="" height={86} loading="lazy" src={result.artworkUrl} width={86} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="tc-result-label">Song found</p>
          <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">{result.title}</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">{result.artist}</p>
          {result.album ? (
            <p className="mt-1 text-xs text-muted-foreground">{result.album}</p>
          ) : null}
        </div>
      </div>

      {links.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <a
              className="tc-service-link"
              href={href}
              key={label}
              rel="noopener noreferrer"
              target="_blank"
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}

      <button
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        onClick={() => navigator.clipboard?.writeText(`${result.title} — ${result.artist}`)}
        type="button"
      >
        <Copy aria-hidden="true" size={14} />
        Copy song and artist
      </button>

      <CreditFooter remainingCredits={remainingCredits} />
    </section>
  )
}

function CreditFooter({ remainingCredits }: Readonly<{ remainingCredits: number }>) {
  return (
    <div className="tc-credit-footer">
      <p className="text-xs text-muted-foreground">
        {remainingCredits} {remainingCredits === 1 ? 'free search' : 'free searches'} remaining
      </p>
      <a
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        href="/earn-credits"
      >
        <Sparkles aria-hidden="true" size={13} />
        Earn up to 3 free credits
      </a>
    </div>
  )
}
