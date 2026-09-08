import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/config'
import { publicEnv } from '@/lib/config/env'

const CONSENT_KEY = 'shiplean_analytics_consent'

export function createGtagQueue(dataLayer: unknown[]) {
  return function gtag(..._args: unknown[]) {
    // biome-ignore lint/complexity/noArguments: Google Tag requires its native arguments object.
    dataLayer.push(arguments)
  }
}

export function PrivacyControls({ locale = 'en' }: Readonly<{ locale?: Locale }>) {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    setGranted(window.localStorage.getItem(CONSENT_KEY) === 'granted')
  }, [])

  useEffect(() => {
    if (!publicEnv.ga4Id) return
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || createGtagQueue(window.dataLayer)
    window.gtag('consent', 'default', { analytics_storage: 'denied' })

    if (!granted) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' })
      return
    }
    window.gtag('consent', 'update', { analytics_storage: 'granted' })
    if (document.querySelector('[data-shiplean-ga4]')) return
    const script = document.createElement('script')
    script.async = true
    script.dataset.shipleanGa4 = 'true'
    script.src = `https://www.googletagmanager.com/gtag/js?id=${publicEnv.ga4Id}`
    document.head.append(script)
    window.gtag('js', new Date())
    window.gtag('config', publicEnv.ga4Id, { anonymize_ip: true })
  }, [granted])

  function toggleConsent() {
    const next = !granted
    setGranted(next)
    window.localStorage.setItem(CONSENT_KEY, next ? 'granted' : 'denied')
  }

  return (
    <button type="button" className="privacy-toggle" aria-pressed={granted} onClick={toggleConsent}>
      {locale === 'zh-CN'
        ? `数据分析：${granted ? '已允许' : '已关闭'}`
        : `Analytics: ${granted ? 'allowed' : 'off'}`}
    </button>
  )
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}
