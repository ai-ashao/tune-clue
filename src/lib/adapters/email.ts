export type EmailMessage = { to: string; subject: string; html: string }

export interface EmailAdapter {
  readonly id: 'disabled' | 'resend'
  send(message: EmailMessage): Promise<{ messageId: string }>
}

export const disabledEmailAdapter: EmailAdapter = {
  id: 'disabled',
  send: async () => {
    throw new Error('Email is disabled. Configure RESEND_API_KEY before enabling the adapter.')
  },
}
