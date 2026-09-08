import type { RecognitionResult as Result } from '@/lib/recognition/types'

export function RecognitionResult({ result }: Readonly<{ result: Result }>) {
  if (result.status === 'no-match') {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">No song match found</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Try a different point in the clip where the music is clearer.
        </p>
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
    <section className="rounded-2xl border bg-card p-5 shadow-sm" aria-live="polite">
      <div className="flex items-start gap-4">
        {result.artworkUrl ? (
          <img
            alt=""
            className="h-20 w-20 rounded-xl border object-cover"
            height={80}
            loading="lazy"
            src={result.artworkUrl}
            width={80}
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Song found
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold">{result.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result.artist}</p>
          {result.album ? (
            <p className="mt-1 text-xs text-muted-foreground">{result.album}</p>
          ) : null}
        </div>
      </div>

      {links.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <a
              className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted/40"
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
        className="mt-4 text-sm font-medium underline underline-offset-4"
        onClick={() => navigator.clipboard?.writeText(`${result.title} — ${result.artist}`)}
        type="button"
      >
        Copy song and artist
      </button>
    </section>
  )
}
