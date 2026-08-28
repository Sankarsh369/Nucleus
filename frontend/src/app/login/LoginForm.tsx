'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ID } from 'appwrite'
import { Loader2 } from 'lucide-react'
import { account } from '@/utils/appwrite/client'

interface LoginFormProps {
  mode: 'login' | 'signup'
  initialError?: string
}

export function LoginForm({ mode, initialError }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === 'signup') {
        await account.create({ userId: ID.unique(), email, password })
      }
      await account.createEmailPasswordSession({ email, password })
      router.push('/app')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(
        mode === 'login' && /invalid/i.test(message)
          ? "Invalid credentials. If you don't have an account, please sign up."
          : message
      )
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-xs font-mono tracking-widest text-white/40 uppercase pl-2">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="developer@company.com"
          className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-xs font-mono tracking-widest text-white/40 uppercase pl-2">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
          <p className="text-red-400 text-xs font-mono text-center">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-4">
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center bg-white text-black font-bold tracking-[0.2em] uppercase font-mono py-3 rounded-xl hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-80 disabled:cursor-wait"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="opacity-80 text-xs tracking-[0.2em]">PROCESSING...</span>
            </span>
          ) : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>
        <Link
          href={mode === 'signup' ? '/login' : '/login?mode=signup'}
          className="text-white/40 hover:text-white text-xs font-mono text-center mt-2 transition-colors uppercase tracking-widest"
        >
          {mode === 'signup' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Link>
      </div>
    </form>
  )
}
