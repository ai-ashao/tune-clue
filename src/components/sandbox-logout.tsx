import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function SandboxLogout() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/sandbox/session', { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not close the local demo session.')
      window.location.replace('/login')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not close the local demo session.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={logout}>
        <LogOut />
        {busy ? 'Closing demo…' : 'Exit local demo'}
      </Button>
      {error ? (
        <output className="max-w-72 text-right text-xs text-destructive">{error}</output>
      ) : null}
    </div>
  )
}
