import { useState } from 'react';
import { Key, ArrowRight, ArrowLeft } from 'lucide-react';

interface TokenEntryPageProps {
  onSubmit: (token: string) => void;
  onBack: () => void;
}

export function TokenEntryPage({ onSubmit, onBack }: TokenEntryPageProps) {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-muted-bg)] border-2 border-[var(--accent)] mb-4">
            <Key className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Enter Reset Token</h1>
          <p className="text-[var(--text-secondary)]">
            Paste the reset token you received via email
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-strong)] p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Field */}
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Reset Token
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="e.g., abc123def456..."
                  className="w-full pl-11 pr-4 py-3 bg-[var(--bg-control)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition font-mono text-sm"
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                The token should be a long string of letters and numbers
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full px-4 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue to Reset Password
              <ArrowRight className="h-5 w-5" />
            </button>

            {/* Back Button */}
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

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Don't have a token?{' '}
            <button
              onClick={() => window.location.href = '/?forgot=true'}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition"
            >
              Request password reset
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
