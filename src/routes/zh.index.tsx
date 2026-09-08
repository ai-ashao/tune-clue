import { createFileRoute } from '@tanstack/react-router'
import { ProductHome, productHomeHead } from '@/components/product-home'

export const Route = createFileRoute('/zh/')({
  head: () => productHomeHead('zh-CN'),
  component: ChineseHome,
})

function ChineseHome() {
  return <ProductHome locale="zh-CN" />
}
