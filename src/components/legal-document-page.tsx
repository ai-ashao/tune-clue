import type { ReactNode } from 'react'
import { buildLegalDocument, type LegalDocument, type LegalProfile } from '@/lib/legal'

export function LegalDocumentPage({
  kind,
  profile,
}: Readonly<{ kind: LegalDocument['kind']; profile: LegalProfile }>) {
  const document = buildLegalDocument(kind, profile)

  return (
    <section
      className="mx-auto max-w-[920px] px-4 py-10 sm:px-6 sm:py-16"
      data-legal-document={kind}
    >
      <header className="max-w-3xl">
        <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          {document.title}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {document.description}
        </p>
        <dl className="mt-6 grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-3">
          <Metadata label="Effective" value={profile.effectiveDate} />
          <Metadata label="Updated" value={profile.lastUpdated} />
          <Metadata
            label="Contact"
            value={
              <a className="underline underline-offset-4" href={`mailto:${profile.contactEmail}`}>
                {profile.contactEmail}
              </a>
            }
          />
        </dl>
      </header>

      <nav className="mt-10 rounded-xl border p-5" aria-label={`${document.title} sections`}>
        <h2 className="text-sm font-semibold">Contents</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="mt-10 space-y-10 text-sm leading-7 text-muted-foreground">
        {document.sections.map((section) => (
          <section aria-labelledby={`${section.id}-title`} id={section.id} key={section.id}>
            <h2
              className="text-xl font-semibold tracking-tight text-foreground"
              id={`${section.id}-title`}
            >
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </article>
    </section>
  )
}

function Metadata({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  )
}
