import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../components/AuthProvider'
import { signIn } from '../utils/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user, profile, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={profile?.is_approved === false ? '/settings' : '/'} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await signIn({ email, password })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="glass-card panel stack-lg auth-panel">
      <div className="stack-sm">
        <p className="eyebrow">Login</p>
        <h2 className="panel-title">Access your account</h2>
      </div>

      <form className="stack-md" onSubmit={handleSubmit}>
        <label className="stack-xs">
          <span className="field-label">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-input"
            placeholder="you@example.com"
          />
        </label>

        <label className="stack-xs">
          <span className="field-label">Password</span>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field-input"
            placeholder="Your password"
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Log in'}
        </button>
      </form>
      <div className="actions-row">
        <Link to="/signup" className="secondary-button">
          Create one
        </Link>
      </div>
    </section>
  )
}
