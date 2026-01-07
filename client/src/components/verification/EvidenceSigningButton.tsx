/**
 * EvidenceSigningButton Component
 *
 * Button to sign evidence with ChittyCert certificate
 * Displays signing status and result
 */

import React, { useState } from 'react';
import { FileKey, Loader2, Check, AlertCircle } from 'lucide-react';

interface EvidenceSigningButtonProps {
  evidenceId: string;
  onSigned?: () => void;
  disabled?: boolean;
  className?: string;
}

export function EvidenceSigningButton({
  evidenceId,
  onSigned,
  disabled = false,
  className = ''
}: EvidenceSigningButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/v1/evidence/${evidenceId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to sign evidence');
      }

      const result = await response.json();

      setSuccess(true);
      setLoading(false);

      // Call onSigned callback after a brief delay to show success state
      setTimeout(() => {
        if (onSigned) {
          onSigned();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium ${className}`}
      >
        <Check className="h-4 w-4" />
        Evidence Signed
      </button>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleSign}
          disabled={loading || disabled}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          <AlertCircle className="h-4 w-4" />
          Retry Signing
        </button>
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleSign}
      disabled={loading || disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing...
        </>
      ) : (
        <>
          <FileKey className="h-4 w-4" />
          Sign Evidence
        </>
      )}
    </button>
  );
}

/**
 * Compact version for inline use
 */
export function EvidenceSigningButtonCompact({
  evidenceId,
  onSigned
}: {
  evidenceId: string;
  onSigned?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    setLoading(true);
    try {
      await fetch(`/api/v1/evidence/${evidenceId}/sign`, { method: 'POST' });
      if (onSigned) onSigned();
    } catch (err) {
      console.error('Signing failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSign}
      disabled={loading}
      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      title="Sign evidence with ChittyCert certificate"
    >
      {loading ? 'Signing...' : 'Sign'}
    </button>
  );
}
