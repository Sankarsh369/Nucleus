'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { account } from '@/utils/appwrite/client'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailClient({ userId, secret }: { userId?: string; secret?: string }) {
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function run() {
      if (!userId || !secret) {
        setStatus('error')
        setMessage('This verification link is missing required information.')
        return
      }
      try {
        await account.updateEmailVerification({ userId, secret })
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'This verification link is invalid or has expired.')
      }
    }
    run()
  }, [userId, secret])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="glass-panel w-full max-w-md p-10 flex flex-col items-center text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-white/60 animate-spin mb-4" />
            <p className="text-white/60 text-sm">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-green-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email verified</h2>
            <p className="text-white/60 text-sm mb-6">Your email address has been confirmed.</p>
            <Link href="/profile" className="text-white/70 hover:text-white text-xs font-mono uppercase tracking-widest">Back to profile</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification failed</h2>
            <p className="text-white/60 text-sm mb-6">{message}</p>
            <Link href="/profile" className="text-white/70 hover:text-white text-xs font-mono uppercase tracking-widest">Back to profile</Link>
          </>
        )}
      </div>
    </div>
  )
}
