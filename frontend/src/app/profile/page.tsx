'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { account } from '@/utils/appwrite/client'
import type { Models } from 'appwrite'

type FieldStatus = { type: 'success' | 'error'; message: string } | null

function inputClass() {
  return 'bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm w-full'
}

function StatusMessage({ status }: { status: FieldStatus }) {
  if (!status) return null
  return (
    <p className={`text-xs font-mono mt-2 ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
      {status.message}
    </p>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [name, setName] = useState('')
  const [namePending, setNamePending] = useState(false)
  const [nameStatus, setNameStatus] = useState<FieldStatus>(null)

  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailPending, setEmailPending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<FieldStatus>(null)

  const [resendPending, setResendPending] = useState(false)
  const [resendStatus, setResendStatus] = useState<FieldStatus>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordPending, setPasswordPending] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>(null)

  useEffect(() => {
    async function load() {
      try {
        const u = await account.get()
        setUser(u)
        setName(u.name)
        setEmail(u.email)
      } catch {
        router.push('/login')
        return
      } finally {
        setAuthChecked(true)
      }
    }
    load()
  }, [router]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameStatus(null)
    setNamePending(true)
    try {
      const updated = await account.updateName({ name })
      setUser(updated)
      setNameStatus({ type: 'success', message: 'Name updated.' })
    } catch (err) {
      setNameStatus({ type: 'error', message: err instanceof Error ? err.message : 'Could not update name.' })
    } finally {
      setNamePending(false)
    }
  }

  const sendVerificationEmail = async () => {
    try {
      await account.createEmailVerification({ url: `${window.location.origin}/profile/verify` });
      return true
    } catch (err) {
      setEmailStatus({ type: 'error', message: err instanceof Error ? err.message : 'Could not send verification email.' })
      return false
    }
  }

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailStatus(null)
    setEmailPending(true)
    try {
      const updated = await account.updateEmail({ email, password: emailPassword })
      setUser(updated)
      setEmailPassword('')
      // Changing the email resets verification status on Appwrite's side --
      // immediately send a fresh verification email for the new address.
      const sent = await sendVerificationEmail()
      setEmailStatus({
        type: 'success',
        message: sent
          ? 'Email updated. A verification link has been sent to your new address.'
          : 'Email updated, but the verification email could not be sent -- use "Resend" below.',
      })
    } catch (err) {
      setEmailStatus({ type: 'error', message: err instanceof Error ? err.message : 'Could not update email.' })
    } finally {
      setEmailPending(false)
    }
  }

  const handleResendVerification = async () => {
    setResendStatus(null)
    setResendPending(true)
    const sent = await sendVerificationEmail()
    setResendStatus(
      sent
        ? { type: 'success', message: 'Verification email sent -- check your inbox.' }
        : { type: 'error', message: 'Could not send verification email.' }
    )
    setResendPending(false)
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordStatus(null)
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    setPasswordPending(true)
    try {
      await account.updatePassword({ password: newPassword, oldPassword: currentPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus({ type: 'success', message: 'Password updated.' })
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err instanceof Error ? err.message : 'Could not update password.' })
    } finally {
      setPasswordPending(false)
    }
  }

  if (!authChecked || !user) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#151520_0%,var(--bg-dark)_50%)] pointer-events-none" />

      <Link href="/app" className="relative z-10 inline-flex items-center gap-2 text-white/50 hover:text-white text-sm font-mono tracking-widest transition-colors mb-8 ml-4">
        <ArrowLeft className="w-4 h-4" /> Back to App
      </Link>

      <div className="relative z-10 max-w-xl mx-auto flex flex-col gap-6">
        <div className="glass-panel p-8 flex items-center gap-4">
          <Image src="/logo/nucleus-white-bgr.png" alt="Nucleus Logo" width={48} height={48} className="w-12 h-12 object-contain opacity-80" />
          <div>
            <h1 className="text-2xl font-bold text-white">Your Profile</h1>
            <p className="text-white/40 text-sm">Manage your account details</p>
          </div>
        </div>

        {/* Name */}
        <form onSubmit={handleSaveName} className="glass-panel p-8 flex flex-col gap-4">
          <label className="text-xs font-mono tracking-widest text-white/40 uppercase">Name</label>
          <input className={inputClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <button type="submit" disabled={namePending || !name.trim()} className="self-start bg-white text-black font-bold text-xs tracking-[0.2em] uppercase font-mono py-2.5 px-6 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60 flex items-center gap-2">
            {namePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Name
          </button>
          <StatusMessage status={nameStatus} />
        </form>

        {/* Email */}
        <form onSubmit={handleSaveEmail} className="glass-panel p-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono tracking-widest text-white/40 uppercase">Email</label>
            {user.emailVerification ? (
              <span className="flex items-center gap-1.5 text-green-400 text-xs font-mono"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
            ) : (
              <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-mono"><AlertTriangle className="w-3.5 h-3.5" /> Not verified</span>
            )}
          </div>
          <input className={inputClass()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <input className={inputClass()} type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="Current password (required to change email)" />
          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={emailPending || !email.trim() || !emailPassword} className="bg-white text-black font-bold text-xs tracking-[0.2em] uppercase font-mono py-2.5 px-6 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60 flex items-center gap-2">
              {emailPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Email
            </button>
            {!user.emailVerification && (
              <button type="button" onClick={handleResendVerification} disabled={resendPending} className="text-white/50 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors flex items-center gap-2">
                {resendPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Resend verification email
              </button>
            )}
          </div>
          <StatusMessage status={emailStatus ?? resendStatus} />
        </form>

        {/* Password */}
        <form onSubmit={handleSavePassword} className="glass-panel p-8 flex flex-col gap-4">
          <label className="text-xs font-mono tracking-widest text-white/40 uppercase">Change Password</label>
          <input className={inputClass()} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" />
          <input className={inputClass()} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" minLength={8} />
          <input className={inputClass()} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" minLength={8} />
          <button type="submit" disabled={passwordPending || !currentPassword || !newPassword} className="self-start bg-white text-black font-bold text-xs tracking-[0.2em] uppercase font-mono py-2.5 px-6 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-60 flex items-center gap-2">
            {passwordPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Update Password
          </button>
          <StatusMessage status={passwordStatus} />
        </form>
      </div>
    </div>
  )
}
