import type { HelpfulGuidanceBlock } from './types'

export function HelpfulGuidance({
  blocks,
}: Readonly<{
  blocks?: ReadonlyArray<HelpfulGuidanceBlock>
}>) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block) => (
        <section
          className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"
          data-helpful-guidance
          key={block.heading}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{block.heading}</h2>

          {block.summary ? (
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {block.summary}
            </p>
          ) : null}

          {block.items?.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {block.items.map((item) => (
                <article className="rounded-xl border bg-card p-4" key={item.title}>
                  {item.label ? (
                    <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                  ) : null}
                  <h3 className={item.label ? 'mt-2 font-medium' : 'font-medium'}>{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              ))}
            </div>
          ) : null}

          {block.paragraphs?.length ? (
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </>
  )
}
