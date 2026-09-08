import { createFileRoute } from '@tanstack/react-router'
import { ProductHome, productHomeHead } from '@/components/product-home'

export const Route = createFileRoute('/')({
  head: () => productHomeHead('en'),
  component: HomePage,
})

function HomePage() {
  return <ProductHome locale="en" />
}
