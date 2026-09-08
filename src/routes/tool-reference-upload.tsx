import { createFileRoute } from '@tanstack/react-router'
import { ImageUp } from 'lucide-react'
import { ToolLandingPage, ToolStructuredData } from '@/components/tool-landing'
import { Button } from '@/components/ui/button'
import { site } from '@/lib/site'
import { toolPageHead } from '@/lib/tool-seo'
import { buildToolStructuredData } from '@/lib/tool-structured-data'
import { toolReferenceUploadConfig as config } from '@/modules/tool-reference-configs'

export const Route = createFileRoute('/tool-reference-upload')({
  head: () => toolPageHead(config),
  component: UploadReferencePage,
})

function UploadReferencePage() {
  const structuredData = buildToolStructuredData(config, site)
  return (
    <>
      <ToolStructuredData items={structuredData} />
      <ToolLandingPage config={config} tool={<UploadReferenceTool />} />
    </>
  )
}

function UploadReferenceTool() {
  return (
    <section
      aria-label="Image upload reference"
      className="mx-auto flex min-h-[220px] max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-5 py-5 text-center shadow-sm"
      data-reference-upload-tool
    >
      <span className="grid size-10 place-items-center rounded-xl bg-muted">
        <ImageUp aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-semibold">Drop images here</h2>
      <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
        This fixture uses a realistic upload-box height so mobile tests do not pass only because the
        reference tool is unusually small.
      </p>
      <Button className="mt-3" data-tool-primary-action type="button">
        Choose images
      </Button>
    </section>
  )
}
