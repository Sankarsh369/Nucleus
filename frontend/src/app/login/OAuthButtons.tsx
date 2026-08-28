'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { OAuthProvider } from 'appwrite'
import { account } from '@/utils/appwrite/client'

type Provider = 'github' | 'google'

// lucide-react dropped brand/logo icons, so provider marks are inlined here
// as plain SVGs instead.
function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.11.82-.27.82-.6 0-.29-.01-1.07-.02-2.1-3.34.75-4.04-1.65-4.04-1.65-.55-1.43-1.34-1.82-1.34-1.82-1.09-.77.08-.75.08-.75 1.2.09 1.84 1.27 1.84 1.27 1.07 1.87 2.81 1.33 3.5 1.02.11-.79.42-1.33.76-1.64-2.67-.31-5.47-1.36-5.47-6.03 0-1.33.46-2.42 1.23-3.28-.12-.31-.53-1.56.12-3.24 0 0 1-.33 3.3 1.25a11.2 11.2 0 0 1 6 0c2.3-1.58 3.3-1.25 3.3-1.25.65 1.68.24 2.93.12 3.24.77.86 1.23 1.95 1.23 3.28 0 4.68-2.81 5.72-5.49 6.02.43.38.81 1.13.81 2.28 0 1.65-.02 2.98-.02 3.38 0 .33.22.72.83.6C20.56 22.34 24 17.74 24 12.3 24 5.5 18.63 0 12 0Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  )
}

const PROVIDERS: { key: Provider; label: string; icon: () => React.JSX.Element; oauth: OAuthProvider }[] = [
  { key: 'github', label: 'Continue with GitHub', icon: GithubIcon, oauth: OAuthProvider.Github },
  { key: 'google', label: 'Continue with Google', icon: GoogleIcon, oauth: OAuthProvider.Google },
]

export function OAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOAuth = (provider: Provider, oauth: OAuthProvider) => {
    setError(null)
    setPending(provider)
    try {
      // Appwrite redirects the browser away to the provider and back to
      // these URLs itself -- there's no promise to await and no separate
      // callback route needed (unlike code-exchange OAuth flows).
      account.createOAuth2Session(
        oauth,
        `${window.location.origin}/app`,
        `${window.location.origin}/login?error=${encodeURIComponent('Could not sign in with that provider. Please try again.')}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sign-in.')
      setPending(null)
    }
  }

  const baseBtn =
    'w-full flex items-center justify-center gap-2.5 bg-white/5 border border-white/10 text-white font-mono text-sm py-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-wait'

  return (
    <div className="w-full flex flex-col gap-3">
      {PROVIDERS.map(({ key, label, icon: Icon, oauth }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleOAuth(key, oauth)}
          disabled={pending !== null}
          className={baseBtn}
        >
          {pending === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon />}
          {label}
        </button>
      ))}
      {error && (
        <p className="text-red-400 text-xs font-mono text-center">{error}</p>
      )}
    </div>
  )
}
