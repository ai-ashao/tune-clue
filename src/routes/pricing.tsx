import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { sandboxUiAvailable } from '@/lib/config/runtime'
import { productSurfaceEnabled } from '@/lib/product-config'
import { localizedPageHead } from '@/lib/seo'

export const Route = createFileRoute('/pricing')({
  beforeLoad: () => {
    if (!productSurfaceEnabled('pricing')) throw notFound()
  },
  head: () =>
    localizedPageHead({
      pageId: 'pricing',
      locale: 'en',
      title: 'Pricing',
      description:
        'A neutral SaaS pricing starter with example plans. Replace pricing, entitlements, and billing integration before launch.',
    }),
  component: PricingPage,
})

const freeFeatures = ['One starter workspace', 'Core product workflow', 'Local starter experience']

const proFeatures = [
  'Everything in Free',
  'Example advanced workflow',
  'Example usage limits',
  'Example support tier',
]

const teamFeatures = [
  'Everything in Pro',
  'Example team capability',
  'Example shared workspace',
  'Example admin controls',
]

function PricingPage() {
  return (
    <section className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
          SaaS pricing starter
        </Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Replace these example plans with the economics of your product.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          This page is part of the product template. It no longer contains ShipLean vendor pricing.
          Define the real plans, entitlements, billing provider, and upgrade path before launch.
        </p>
      </header>

      <div className="mt-10 grid gap-3 lg:grid-cols-3">
        <PriceCard name="Free" price="$0" note="example starter tier" features={freeFeatures}>
          {sandboxUiAvailable && productSurfaceEnabled('app') ? (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Open starter app</Link>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Configure product action
            </Button>
          )}
        </PriceCard>

        <PriceCard
          name="Pro"
          price="$19"
          note="example monthly price"
          features={proFeatures}
          featured
        >
          <Button className="w-full" disabled>
            Connect billing before launch
          </Button>
        </PriceCard>

        <PriceCard name="Team" price="$49" note="example monthly price" features={teamFeatures}>
          <Button variant="outline" className="w-full" disabled>
            Connect billing before launch
          </Button>
        </PriceCard>
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-6 text-muted-foreground">
        These numbers are placeholders for product design only. Production payments, entitlements,
        webhooks, and credits remain unconfigured until the product explicitly implements them.
      </p>
    </section>
  )
}

function PriceCard({
  name,
  price,
  note,
  features,
  featured = false,
  children,
}: Readonly<{
  name: string
  price: string
  note: string
  features: readonly string[]
  featured?: boolean
  children: ReactNode
}>) {
  return (
    <Card className={featured ? 'relative border-primary/40 bg-card shadow-none' : 'shadow-none'}>
      {featured ? <Badge className="absolute -top-3 left-6">Example default</Badge> : null}
      <CardHeader>
        <CardDescription>{name}</CardDescription>
        <CardTitle className="text-4xl tracking-[-0.05em]">{price}</CardTitle>
        <CardDescription>{note}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3 text-sm">
          {features.map((item) => (
            <li className="flex gap-2.5" key={item}>
              <Check className="mt-0.5 size-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>{children}</CardFooter>
    </Card>
  )
}
