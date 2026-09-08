import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/components/legal-document-page'
import { localizedPageHead } from '@/lib/seo'
import { legalProfile } from '@/modules/legal-profile'

export const Route = createFileRoute('/terms-of-service')({
  head: () =>
    localizedPageHead({
      pageId: 'terms',
      locale: 'en',
      title: 'Terms of Service',
      description: `Read the rules, responsibilities, service boundaries, and legal terms for using ${legalProfile.productName}.`,
    }),
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  return <LegalDocumentPage kind="terms" profile={legalProfile} />
}
