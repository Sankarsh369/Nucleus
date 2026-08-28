import { OAuthButtons } from './OAuthButtons'
import { LoginForm } from './LoginForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string, mode?: string }> }) {
  const params = await searchParams
  const error = params?.error
  const mode = params?.mode === 'signup' ? 'signup' : 'login'

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#151520_0%,var(--bg-dark)_50%)]" />
      <div className="absolute top-0 w-full h-[50vh] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,transparent_60%)] pointer-events-none" />
      <div className="bg-grid absolute inset-0 opacity-[0.05] pointer-events-none" />

      <Link href="/" className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 text-sm font-mono tracking-widest transition-colors z-20">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div className="glass-panel w-full max-w-md p-10 relative z-10 flex flex-col items-center bento-reveal">
        <Image
          src="/logo/nucleus-white-bgr.png"
          alt="Nucleus Logo"
          width={60}
          height={60}
          className="w-16 h-16 object-contain mb-8 opacity-80"
        />

        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          {mode === 'signup' ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="text-white/60 font-light text-sm mb-8 text-center">
          {mode === 'signup'
            ? 'Join Nucleus to start compressing massive contexts.'
            : 'Sign in to access your Nucleus dashboard and compress contexts.'}
        </p>

        <OAuthButtons />

        <div className="w-full flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs font-mono tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <LoginForm mode={mode} initialError={error} />
      </div>
    </div>
  )
}
