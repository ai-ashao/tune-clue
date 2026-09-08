import type { ToolLandingConfig } from '@/components/tool-landing'

export const toolReferenceConfig = {
  version: '0.2',
  preset: 'tool-default',
  toolId: 'tool-reference',
  locale: 'en',
  seo: {
    primaryKeyword: 'text length checker',
    title: 'Text Length Checker - Free Online Tool',
    description:
      'Free online text length checker for counting characters and words. No installation or signup required.',
    path: '/tool-reference',
    indexable: false,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'Free online reference tool',
    title: 'Text Length Checker',
    description: 'Count characters and words online for free. No installation or signup required.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: false,
    processing: 'local',
  },
  constraints: { other: ['Plain text input'] },
  completion: {
    highlights: ['Character count', 'Word count', 'Instant local result'],
  },
  capabilities: {
    title: 'Capabilities',
    items: [
      {
        id: 'characters',
        title: 'Count characters',
        description: 'Measure the exact number of characters in the current text.',
      },
      {
        id: 'words',
        title: 'Count words',
        description: 'Count whitespace-separated words without sending the text to a server.',
      },
      {
        id: 'local',
        title: 'Keep text local',
        description: 'The reference interaction uses browser state and does not submit the text.',
      },
    ],
  },
  valueLabels: { localProcessing: 'Data stays in your browser' },
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Tool Reference', href: '/tool-reference' },
  ],
  helpfulGuidance: [
    {
      heading: 'How the reference counter treats words',
      summary:
        'The counter trims surrounding whitespace and treats groups of non-whitespace characters as words.',
      items: [
        {
          label: 'Characters',
          title: 'Every typed character counts',
          description: 'Spaces and punctuation are included in the character total.',
        },
        {
          label: 'Words',
          title: 'Whitespace separates words',
          description: 'Multiple adjacent spaces do not create additional words.',
        },
      ],
    },
  ],
  faq: {
    title: 'Reference FAQ',
    items: [
      {
        question: 'Is this reference tool free to use?',
        answer: 'Yes. It is a local ShipLean reference route and does not require an account.',
      },
      {
        question: 'Does the text leave the browser?',
        answer: 'No. The reference counter uses client-side React state and does not submit text.',
      },
    ],
  },
  structuredData: { enableFaq: true, enableBreadcrumbs: true },
} satisfies ToolLandingConfig

export const toolReferenceUploadConfig = {
  version: '0.2',
  preset: 'tool-default',
  toolId: 'tool-reference-upload',
  locale: 'en',
  seo: {
    primaryKeyword: 'image upload reference',
    title: 'Image Upload Reference - Free Online Tool',
    description:
      'Free online image upload reference for validating a realistic Tool Landing viewport. No installation or signup required.',
    path: '/tool-reference-upload',
    indexable: false,
    applicationCategory: 'UtilitiesApplication',
  },
  hero: {
    eyebrow: 'Upload-first QA fixture',
    title: 'Image Upload Reference',
    description:
      'Free online upload fixture for validating a realistic image-tool layout. No installation or signup required.',
  },
  experience: {
    free: true,
    online: true,
    installationRequired: false,
    signupRequired: false,
    processing: 'local',
    noWatermark: true,
  },
  constraints: {
    acceptedFormats: ['JPG', 'PNG', 'WebP'],
    maxFileSize: '20 MB',
    maxFiles: 20,
  },
  completion: {
    highlights: ['Batch-ready input', 'Local processing', 'Multiple image formats'],
  },
  capabilities: {
    title: 'Capabilities',
    items: [
      {
        id: 'drag-drop',
        title: 'Drag-and-drop input',
        description:
          'A realistic upload surface sized like an image utility rather than a tiny text form.',
      },
      {
        id: 'formats',
        title: 'Multiple image formats',
        description: 'The fixture visibly communicates supported formats and file constraints.',
      },
      {
        id: 'local',
        title: 'Local-first task flow',
        description: 'The fixture represents a browser-local tool before any server integration.',
      },
    ],
  },
  valueLabels: { localProcessing: 'Files stay on your device' },
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Upload Reference', href: '/tool-reference-upload' },
  ],
} satisfies ToolLandingConfig

export const toolReferenceConfigs = [
  toolReferenceConfig,
  toolReferenceUploadConfig,
] as const satisfies ReadonlyArray<ToolLandingConfig>
