import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useId, useState } from 'react'
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
import { Input } from '@/components/ui/input'

export function SandboxLogin() {
  const navigate = useNavigate()
  const emailId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/sandbox/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'maker@shiplean.local' }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Local demo login failed.')
      await navigate({ to: '/dashboard' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Local demo login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-md gap-0 py-0 shadow-xl shadow-foreground/5">
      <CardHeader className="gap-4 border-b p-6 sm:p-8">
        <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-amber-500" /> Local starter demo
        </Badge>
        <div>
          <CardTitle className="text-2xl tracking-tight">Open the application shell</CardTitle>
          <CardDescription className="mt-2 leading-6">
            Preview a protected dashboard without configuring an external auth provider.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div className="space-y-2">
          <label className="mb-0 text-sm font-medium normal-case tracking-normal" htmlFor={emailId}>
            Email
          </label>
          <Input id={emailId} value="maker@shiplean.local" readOnly />
        </div>
        <Button className="w-full" size="lg" disabled={busy} onClick={login}>
          {busy ? 'Opening demo…' : 'Continue to dashboard'}
          {!busy ? <ArrowRight /> : null}
        </Button>
        {error ? (
          <output className="block rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </output>
        ) : null}
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 border-t bg-muted/40 p-6 text-xs leading-5 text-muted-foreground sm:p-8">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="size-4" /> No external auth call
        </p>
        <p className="flex gap-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          This creates only a local, eight-hour HttpOnly demo cookie. No personal data leaves this
          process.
        </p>
      </CardFooter>
    </Card>
  )
}
