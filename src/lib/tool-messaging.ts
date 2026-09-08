import type {
  ToolExperience,
  ToolValueLabels,
  ToolValueSignal,
} from '@/components/tool-landing/types'

export const defaultToolValueLabels: ToolValueLabels = {
  free: 'Free',
  online: 'Online',
  noInstallation: 'No installation',
  noSignup: 'No signup',
  browserBased: 'Browser-based',
  localProcessing: 'Files stay on your device',
  noWatermark: 'No watermark',
}

export function deriveToolValueSignals(
  experience: ToolExperience,
  labels: Partial<ToolValueLabels> = {},
): ReadonlyArray<ToolValueSignal> {
  const copy = { ...defaultToolValueLabels, ...labels }
  const signals: ToolValueSignal[] = []

  if (experience.free) signals.push({ key: 'free', label: copy.free })
  if (experience.online) signals.push({ key: 'online', label: copy.online })
  if (!experience.installationRequired) {
    signals.push({ key: 'noInstallation', label: copy.noInstallation })
  }
  if (!experience.signupRequired) {
    signals.push({ key: 'noSignup', label: copy.noSignup })
  }

  if (experience.online && experience.processing === 'local') {
    signals.push({ key: 'browserBased', label: copy.browserBased })
  }

  if (experience.processing === 'local') {
    signals.push({ key: 'localProcessing', label: copy.localProcessing })
  }

  if (experience.noWatermark) {
    signals.push({ key: 'noWatermark', label: copy.noWatermark })
  }

  return signals
}

export function buildEnglishToolSeoTitle(input: {
  primaryKeyword: string
  experience: ToolExperience
}) {
  const { primaryKeyword, experience } = input

  if (experience.free && experience.online) {
    return `${primaryKeyword} - Free Online Tool`
  }

  if (experience.online) return `${primaryKeyword} - Online Tool`
  if (experience.free) return `${primaryKeyword} - Free Tool`
  return primaryKeyword
}

export function buildEnglishToolSeoDescription(input: {
  task: string
  experience: ToolExperience
  formats?: ReadonlyArray<string>
}) {
  const { task, experience, formats = [] } = input
  const prefix =
    experience.free && experience.online
      ? `Free online tool to ${task}.`
      : experience.online
        ? `Online tool to ${task}.`
        : experience.free
          ? `Free tool to ${task}.`
          : `Tool to ${task}.`

  const details: string[] = []

  if (!experience.installationRequired) details.push('No installation required.')
  if (!experience.signupRequired) details.push('No signup required.')

  if (experience.online && experience.processing === 'local') {
    details.push('Data is processed in your browser.')
  }

  if (experience.processing === 'local') {
    details.push('Your data stays on your device.')
  }

  if (formats.length > 0) {
    details.push(`Supports ${formats.join(', ')}.`)
  }

  return [prefix, ...details].join(' ')
}

export function validateEnglishToolMessaging(input: {
  heroDescription: string
  seoTitle: string
  seoDescription: string
  experience: ToolExperience
}) {
  const issues: string[] = []
  const hero = input.heroDescription.toLowerCase()
  const title = input.seoTitle.toLowerCase()
  const description = input.seoDescription.toLowerCase()

  if (input.experience.free && !hero.includes('free')) {
    issues.push('Hero description should state that the tool is free.')
  }

  if (input.experience.online && !hero.includes('online')) {
    issues.push('Hero description should state that the tool works online.')
  }

  if (input.experience.free && input.experience.online) {
    const seoMentionsIntent =
      (title.includes('free') && title.includes('online')) ||
      (description.includes('free') && description.includes('online'))

    if (!seoMentionsIntent) {
      issues.push('SEO title or description should naturally include free and online.')
    }
  }

  if (!input.experience.installationRequired) {
    const mentionsNoInstall =
      hero.includes('no installation') ||
      hero.includes('no download') ||
      description.includes('no installation') ||
      description.includes('no download')

    if (!mentionsNoInstall) {
      issues.push('Visible or SEO copy should explain that no installation is required.')
    }
  }

  if (!input.experience.signupRequired) {
    const mentionsNoSignup =
      hero.includes('no signup') ||
      hero.includes('no account') ||
      hero.includes('no installation or signup required') ||
      description.includes('no signup') ||
      description.includes('no account') ||
      description.includes('no installation or signup required')

    if (!mentionsNoSignup) {
      issues.push('Visible or SEO copy should explain that no signup is required.')
    }
  }

  if (input.experience.processing !== 'local') {
    const unsupportedLocalClaim =
      hero.includes('stay on your device') ||
      hero.includes('stays on your device') ||
      hero.includes('processed locally') ||
      hero.includes('no upload') ||
      description.includes('stay on your device') ||
      description.includes('stays on your device') ||
      description.includes('processed locally') ||
      description.includes('no upload')

    if (unsupportedLocalClaim) {
      issues.push('Local-processing claims require experience.processing === local.')
    }
  }

  if (!input.experience.online) {
    const unsupportedBrowserClaim =
      hero.includes('in your browser') ||
      hero.includes('browser-based') ||
      description.includes('in your browser') ||
      description.includes('browser-based')

    if (unsupportedBrowserClaim) {
      issues.push('Browser-based claims require experience.online === true.')
    }
  }

  return issues
}
