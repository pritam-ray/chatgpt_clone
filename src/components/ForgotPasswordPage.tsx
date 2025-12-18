import { useState } from 'react';
import { Mail, Loader2, Check, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      // Store token if in development mode
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
        <div className="w-full max-w-md">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Check Your Email</h1>
            <p className="text-[var(--text-secondary)]">
              If an account exists for <span className="font-medium text-[var(--text-primary)]">{email}</span>, 
              you will receive password reset instructions.
            </p>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-strong)] p-8 shadow-xl">
              {/* Development Mode - Show Token with Reset Link */}
            {resetToken && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg px-4 py-3 mb-4">
                <p className="text-yellow-500 text-sm font-medium mb-2">Development Mode</p>
                <p className="text-xs text-[var(--text-secondary)] mb-2">Reset token (copy this):</p>
                <input
                  type="text"
                  value={resetToken}
                  readOnly
                  className="w-full px-3 py-2 bg-[var(--bg-control)] border border-[var(--border-subtle)] rounded text-xs font-mono text-[var(--text-primary)] mb-3"
                  onClick={(e) => e.currentTarget.select()}
                />
                <a
                  href={`${window.location.origin}?token=${resetToken}`}
                  className="block w-full px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium text-center text-sm"
                >
                  Go to Reset Password Page
                </a>
                <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                  Or click the link above to reset your password
                </p>
              </div>
            )}            <div className="space-y-4">
              <div className="bg-[var(--bg-control)] rounded-lg p-4 border border-[var(--border-subtle)]">
                <h3 className="font-medium text-[var(--text-primary)] mb-2">What's next?</h3>
                <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] mt-0.5">1.</span>
                    <span>Check your email inbox and spam folder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] mt-0.5">2.</span>
                    <span>Click the reset link in the email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] mt-0.5">3.</span>
                    <span>Create a new password for your account</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={onBack}
                  className="w-full px-4 py-3 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-control)] transition font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back to Sign In
                </button>
                
                <div className="text-center">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">Already have a reset token?</p>
                  <a
                    href="/?reset=true"
                    className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition"
                  >
                    Enter Reset Token
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-muted-bg)] border-2 border-[var(--accent)] mb-4">
            <Mail className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Forgot Password?</h1>
          <p className="text-[var(--text-secondary)]">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-strong)] p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-3 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-[var(--bg-control)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Instructions'
              )}
            </button>

            {/* Back to Sign In */}
            <button
              type="button"
              onClick={onBack}
              className="w-full px-4 py-3 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-control)] transition font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Sign In
            </button>
          </form>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
