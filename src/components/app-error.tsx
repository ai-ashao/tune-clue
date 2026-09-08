import type { ErrorComponentProps } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export function AppError({ error, reset }: ErrorComponentProps) {
  const message =
    import.meta.env.DEV && error.message
      ? error.message
      : 'An unexpected route error occurred. Please try again.'
  return (
    <section className="empty-state" role="alert">
      <p className="eyebrow">RUNTIME / RECOVERABLE</p>
      <h1>This module missed the rail.</h1>
      <p className="error-detail">{message}</p>
      <div className="button-row">
        <button type="button" className="button button-dark" onClick={reset}>
          Try again
        </button>
        <Link className="button button-plain" to="/">
          Return home
        </Link>
      </div>
    </section>
  )
}
