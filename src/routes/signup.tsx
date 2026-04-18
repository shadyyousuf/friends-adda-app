import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../components/AuthProvider'
import { signUp } from '../utils/auth'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { user, profile, isLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to={profile?.is_approved === false ? '/settings' : '/'} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const result = await signUp({ fullName, email, password })
      setSuccessMessage(
        result.session
          ? 'Account created. You are signed in and waiting for admin approval.'
          : 'Account created. Check your email if Supabase confirmation is enabled.',
      )
      setPassword('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to sign up.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="glass-card panel stack-lg auth-panel">
      <div className="stack-sm">
        <p className="eyebrow">Signup</p>
        <h2 className="panel-title">Create your Friends Adda account</h2>
      </div>

      <form className="stack-md" onSubmit={handleSubmit}>
        <label className="stack-xs">
          <span className="field-label">Full name</span>
          <input
            required
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="field-input"
            placeholder="Your full name"
          />
        </label>

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
            minLength={8}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field-input"
            placeholder="At least 8 characters"
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {successMessage ? <p className="form-success">{successMessage}</p> : null}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <div className="actions-row">
        <Link to="/login" className="secondary-button">
          Log in
        </Link>
      </div>
    </section>
  )
}
