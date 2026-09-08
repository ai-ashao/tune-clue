import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '@/components/legal-document-page'
import { localizedPageHead } from '@/lib/seo'
import { legalProfile } from '@/modules/legal-profile'

export const Route = createFileRoute('/privacy-policy')({
  head: () =>
    localizedPageHead({
      pageId: 'privacy',
      locale: 'en',
      title: 'Privacy Policy',
      description: `Learn how ${legalProfile.productName} handles information, browser storage, analytics, service providers, and privacy requests.`,
    }),
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return <LegalDocumentPage kind="privacy" profile={legalProfile} />
}
