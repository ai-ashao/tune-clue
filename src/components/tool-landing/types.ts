import type { Locale } from '@/i18n/config'

export type ToolProcessingMode = 'local' | 'server' | 'hybrid'

export type ToolExperience = {
  free: boolean
  online: boolean
  installationRequired: boolean
  signupRequired: boolean
  processing: ToolProcessingMode
  noWatermark?: boolean
  privacyFriendly?: boolean
}

export type ToolValueSignalKey =
  | 'free'
  | 'online'
  | 'noInstallation'
  | 'noSignup'
  | 'browserBased'
  | 'localProcessing'
  | 'noWatermark'
  | 'privacyFriendly'

export type ToolValueSignal = {
  key: ToolValueSignalKey
  label: string
  description?: string
}

export type ToolValueLabels = {
  free: string
  online: string
  noInstallation: string
  noSignup: string
  browserBased: string
  localProcessing: string
  noWatermark: string
  privacyFriendly: string
}

export type ToolLandingA11y = {
  breadcrumbLabel?: string
  valueSignalsLabel?: string
  constraintsLabel?: string
  completionLabel?: string
}

export type ToolBreadcrumb = {
  label: string
  href: string
}

export type ToolSectionItem = {
  title: string
  description: string
}

export type ToolCapability = {
  id: string
  title: string
  description: string
}

export type ToolConstraintLabels = {
  outputPrefix: string
  maxFileSizePrefix: string
  maxFilesPrefix: string
  filesSuffix: string
}

export type ToolConstraints = {
  acceptedFormats?: ReadonlyArray<string>
  outputFormats?: ReadonlyArray<string>
  maxFileSize?: string
  maxFiles?: number
  dimensions?: string
  other?: ReadonlyArray<string>
  labels?: Partial<ToolConstraintLabels>
}

export type ToolCompletionConfig = {
  title?: string
  description?: string
  highlights: ReadonlyArray<string>
}

export type HelpfulGuidanceItem = {
  label?: string
  title: string
  description: string
}

export type HelpfulGuidanceBlock = {
  heading: string
  summary?: string
  items?: ReadonlyArray<HelpfulGuidanceItem>
  paragraphs?: ReadonlyArray<string>
}

export type ToolFaqItem = {
  question: string
  answer: string
}

export type ToolSeoContentBlock = {
  heading: string
  paragraphs: ReadonlyArray<string>
}

export type ToolStructuredDataConfig = {
  applicationCategory?: string
  operatingSystem?: string
  priceCurrency?: string
  enableFaq?: boolean
  enableBreadcrumbs?: boolean
}

export type ToolLandingConfig = {
  version: '0.1' | '0.2'
  preset: 'tool-default'
  toolId: string
  locale?: Locale
  seo: {
    primaryKeyword?: string
    title: string
    description: string
    path: string
    /**
     * Indexability is explicit at the Tool Landing level.
     * Indexable pages require a primaryKeyword; QA/reference routes should set false.
     */
    indexable?: boolean
    applicationCategory?: string
    socialImage?: string
  }
  hero: {
    eyebrow?: string
    title: string
    description: string
  }
  experience: ToolExperience
  constraints?: ToolConstraints
  completion?: ToolCompletionConfig
  completionPlacement?: 'hero' | 'after-capabilities'
  capabilities?: {
    title: string
    description?: string
    items: ReadonlyArray<ToolCapability>
  }
  valueLabels?: Partial<ToolValueLabels>
  a11y?: ToolLandingA11y
  breadcrumbs?: ReadonlyArray<ToolBreadcrumb>
  relatedTools?: {
    title: string
    toolIds: ReadonlyArray<string>
  }
  benefits?: {
    title: string
    items: ReadonlyArray<ToolSectionItem>
  }
  howItWorks?: {
    title: string
    description?: string
    steps: ReadonlyArray<ToolSectionItem>
  }
  /** @deprecated Use capabilities for v0.2 tool pages. */
  features?: {
    title: string
    items: ReadonlyArray<ToolSectionItem>
  }
  useCases?: {
    title: string
    items: ReadonlyArray<ToolSectionItem>
  }
  helpfulGuidance?: ReadonlyArray<HelpfulGuidanceBlock>
  faq?: {
    title: string
    description?: string
    items: ReadonlyArray<ToolFaqItem>
  }
  seoContent?: ReadonlyArray<ToolSeoContentBlock>
  bottomAction?: {
    title: string
    description?: string
    actionLabel: string
    href: string
  }
  structuredData?: ToolStructuredDataConfig
}
