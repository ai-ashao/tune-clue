import type { Locale } from './config'

type ProductHomeMessages = {
  meta: {
    saasTitle: string
    saasDescription: string
    toolTitle: string
    toolDescription: string
  }
  saas: {
    eyebrow: string
    title: string
    description: string
    primary: string
    secondary: string
    proof: ReadonlyArray<string>
    previewEyebrow: string
    previewTitle: string
    previewItems: ReadonlyArray<readonly [string, string]>
    benefitsEyebrow: string
    benefitsTitle: string
    benefits: ReadonlyArray<readonly [string, string]>
    workflowEyebrow: string
    workflowTitle: string
    workflow: ReadonlyArray<readonly [string, string]>
    pricingEyebrow: string
    pricingTitle: string
    pricingBody: string
    pricingAction: string
    faqTitle: string
    faqs: ReadonlyArray<readonly [string, string]>
    finalTitle: string
    finalBody: string
    finalAction: string
  }
  tool: {
    eyebrow: string
    title: string
    description: string
    toolHeading: string
    toolDescription: string
    inputLabel: string
    inputDescription: string
    placeholder: string
    action: string
    characters: string
    words: string
    constraints: ReadonlyArray<string>
    completion: ReadonlyArray<string>
    capabilitiesTitle: string
    capabilities: ReadonlyArray<readonly [string, string, string]>
    faqTitle: string
    faqs: ReadonlyArray<readonly [string, string]>
    valueLabels: {
      free: string
      online: string
      noInstallation: string
      noSignup: string
      browserBased: string
      localProcessing: string
      noWatermark: string
    }
  }
}

export const productHomeMessages = {
  en: {
    meta: {
      saasTitle: 'Focused SaaS Starter',
      saasDescription:
        'A neutral SaaS starter homepage with a clear value proposition, product preview, workflow, pricing entry, and conversion path.',
      toolTitle: 'Text Length Checker - Free Online Tool',
      toolDescription:
        'Free online text length checker for counting characters and words. No installation or signup required.',
    },
    saas: {
      eyebrow: 'SaaS STARTER',
      title: 'Turn one clear workflow into a product people can use.',
      description:
        'This is the neutral SaaS homepage shipped with the template. Replace the starter copy, preview, pricing, and conversion path with the real product before launch.',
      primary: 'Open starter app',
      secondary: 'See how it works',
      proof: ['Focused first workflow', 'Typed product shell', 'Repository-wide verification'],
      previewEyebrow: 'PRODUCT PREVIEW',
      previewTitle: 'A small surface that shows the product before asking for commitment.',
      previewItems: [
        ['Workspace', 'One primary job stays obvious.'],
        ['Activity', 'Recent progress is easy to scan.'],
        ['Status', 'Important state is visible without digging.'],
      ],
      benefitsEyebrow: 'OUTCOMES',
      benefitsTitle: 'Explain the value before listing implementation details.',
      benefits: [
        ['Clear first job', 'Lead with the user outcome the product exists to deliver.'],
        [
          'Visible product',
          'Show the core workflow or interface instead of relying on abstract claims.',
        ],
        ['One next step', 'Give the visitor a primary action that matches the product stage.'],
      ],
      workflowEyebrow: 'HOW IT WORKS',
      workflowTitle: 'Keep the first product journey short enough to understand.',
      workflow: [
        ['Start', 'The user enters through one obvious product promise.'],
        ['Complete', 'The product guides the user through the smallest useful workflow.'],
        ['Return', 'The user sees a reason to come back, continue, or upgrade.'],
      ],
      pricingEyebrow: 'PRICING ENTRY',
      pricingTitle: 'Pricing belongs to the product, not to the template vendor.',
      pricingBody:
        'The included pricing route is now neutral starter content. Replace plans, entitlements, and billing integration with the real SaaS model.',
      pricingAction: 'View starter pricing',
      faqTitle: 'Starter questions',
      faqs: [
        [
          'Is this the ShipLean website?',
          'No. The ShipLean marketing website lives in the separate shiplean-site repository. This runtime is only the product template.',
        ],
        [
          'Do I have to keep this layout?',
          'No. Keep the quality contracts, but replace the product composition when the real SaaS needs a different layout.',
        ],
        [
          'Are payments and production auth already connected?',
          'No. The starter keeps those production integrations explicit and unconfigured until the product actually needs them.',
        ],
      ],
      finalTitle: 'Replace the starter with one real promise and one real workflow.',
      finalBody:
        'Set the brand, keep product.mode as SaaS, then adapt this surface around the first user and first job.',
      finalAction: 'Open starter app',
    },
    tool: {
      eyebrow: 'FREE ONLINE TOOL',
      title: 'Text Length Checker',
      description:
        'Count characters and words online for free. No installation or signup required.',
      toolHeading: 'Check text length',
      toolDescription: 'Paste text below. Everything runs in this browser tab.',
      inputLabel: 'Text',
      inputDescription: 'Spaces and punctuation count toward the character total.',
      placeholder: 'Type or paste text here',
      action: 'Count text',
      characters: 'characters',
      words: 'words',
      constraints: ['Plain text input'],
      completion: ['Character count', 'Word count', 'Instant local result'],
      capabilitiesTitle: 'Capabilities',
      capabilities: [
        [
          'characters',
          'Count characters',
          'Measure the exact number of characters in the current text.',
        ],
        [
          'words',
          'Count words',
          'Count whitespace-separated words without sending the text to a server.',
        ],
        ['local', 'Keep text local', 'Use browser state without submitting the text to a backend.'],
      ],
      faqTitle: 'Tool FAQ',
      faqs: [
        ['Is this tool free?', 'Yes. The starter tool does not require an account or payment.'],
        [
          'Does the text leave the browser?',
          'No. The reference interaction uses local browser state.',
        ],
      ],
      valueLabels: {
        free: 'Free',
        online: 'Online',
        noInstallation: 'No installation',
        noSignup: 'No signup',
        browserBased: 'Browser-based',
        localProcessing: 'Data stays in your browser',
        noWatermark: 'No watermark',
      },
    },
  },
  'zh-CN': {
    meta: {
      saasTitle: '聚焦型 SaaS 模板',
      saasDescription:
        '一个中性的 SaaS 模板首页，包含清晰价值主张、产品预览、工作流、定价入口和转化路径。',
      toolTitle: '文本长度统计 - 免费在线工具',
      toolDescription: '免费在线统计文本字符数和单词数，无需安装，也无需注册。',
    },
    saas: {
      eyebrow: 'SAAS 模板',
      title: '把一个清晰工作流，做成用户真正能使用的产品。',
      description:
        '这是模板自带的中性 SaaS 首页，不是 ShipLean 官网。上线前应替换成真实产品的文案、产品预览、定价和转化路径。',
      primary: '打开模板应用',
      secondary: '查看工作流程',
      proof: ['聚焦首个工作流', '类型化产品外壳', '仓库级完整验收'],
      previewEyebrow: '产品预览',
      previewTitle: '先让用户看到产品，再要求用户做出承诺。',
      previewItems: [
        ['工作区', '一个核心任务始终足够明显。'],
        ['动态', '最近进展可以快速扫一眼。'],
        ['状态', '重要状态无需层层查找。'],
      ],
      benefitsEyebrow: '用户结果',
      benefitsTitle: '先解释产品价值，再罗列实现细节。',
      benefits: [
        ['首个任务清晰', '先说明这个产品要帮用户完成什么。'],
        ['产品可见', '展示核心工作流或界面，而不是只写抽象功能。'],
        ['下一步唯一', '给用户一个符合当前产品阶段的主要行动。'],
      ],
      workflowEyebrow: '工作流程',
      workflowTitle: '首个产品旅程应该短到一眼就能理解。',
      workflow: [
        ['开始', '用户从一个明确的产品承诺进入。'],
        ['完成', '产品引导用户完成最小但有价值的工作流。'],
        ['回来', '用户能看到继续使用、返回或升级的理由。'],
      ],
      pricingEyebrow: '定价入口',
      pricingTitle: '定价属于你的产品，不属于模板供应商。',
      pricingBody:
        '模板里的 Pricing 路由现在只保留中性示例。上线前应替换真实套餐、权益和支付集成。',
      pricingAction: '查看模板定价',
      faqTitle: '模板常见问题',
      faqs: [
        [
          '这是 ShipLean官网吗？',
          '不是。ShipLean 官网位于独立的 shiplean-site 仓库，这里只是产品模板运行时。',
        ],
        [
          '必须保留这套布局吗？',
          '不需要。保留质量契约即可，真实 SaaS 可以按产品需要重新组织页面。',
        ],
        [
          '支付和生产认证已经接好了吗？',
          '没有。模板会明确保留这些生产集成边界，只有产品真实需要时再接入。',
        ],
      ],
      finalTitle: '把模板替换成一个真实承诺和一个真实工作流。',
      finalBody: '设置品牌，保留 SaaS 模式，再围绕第一个用户和第一个任务改造首页。',
      finalAction: '打开模板应用',
    },
    tool: {
      eyebrow: '免费在线工具',
      title: '文本长度统计',
      description: '免费在线统计字符数和单词数，无需安装，也无需注册。',
      toolHeading: '统计文本长度',
      toolDescription: '在下面粘贴文本，所有处理都在当前浏览器标签页完成。',
      inputLabel: '文本',
      inputDescription: '空格和标点也会计入字符数。',
      placeholder: '输入或粘贴文本',
      action: '统计文本',
      characters: '个字符',
      words: '个单词',
      constraints: ['纯文本输入'],
      completion: ['字符统计', '单词统计', '浏览器本地即时结果'],
      capabilitiesTitle: '能力',
      capabilities: [
        ['characters', '统计字符', '精确统计当前文本的字符数量。'],
        ['words', '统计单词', '按空白字符分隔统计单词，不需要上传文本。'],
        ['local', '文本留在本地', '使用浏览器状态完成统计，不把文本提交到后端。'],
      ],
      faqTitle: '工具常见问题',
      faqs: [
        ['这个工具免费吗？', '是。模板工具不需要账号，也不需要付费。'],
        ['文本会离开浏览器吗？', '不会。这个示例只使用浏览器本地状态。'],
      ],
      valueLabels: {
        free: '免费',
        online: '在线',
        noInstallation: '无需安装',
        noSignup: '无需注册',
        browserBased: '浏览器运行',
        localProcessing: '数据保留在浏览器',
        noWatermark: '无水印',
      },
    },
  },
} satisfies Record<Locale, ProductHomeMessages>
