/**
 * SignatureVerificationBadge Component
 *
 * Displays certificate-based signature verification status for evidence
 * Shows signature validity, certificate info, and verification timestamp
 */

import React, { useState, useEffect } from 'react';
import { Check, X, Shield, Clock, FileKey, AlertTriangle } from 'lucide-react';

interface SignatureInfo {
  evidenceId: string;
  artifactId: string;
  isSigned: boolean;
  certificateSerial: string;
  signedAt: string;
  algorithm: string;
  hashAlgorithm: string;
}

interface VerificationResult {
  signatureValid: boolean;
  certificateValid: boolean;
  overallValid: boolean;
  details: string;
  verifiedAt: string;
}

interface SignatureVerificationBadgeProps {
  evidenceId: string;
  showDetails?: boolean;
  autoVerify?: boolean;
}

export function SignatureVerificationBadge({
  evidenceId,
  showDetails = false,
  autoVerify = true
}: SignatureVerificationBadgeProps) {
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSignatureInfo();
  }, [evidenceId]);

  const fetchSignatureInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/evidence/${evidenceId}/signature-info`);

      if (!response.ok) {
        if (response.status === 404) {
          setSignatureInfo(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch signature info');
      }

      const result = await response.json();
      setSignatureInfo(result.data);

      // Auto-verify if requested
      if (autoVerify) {
        await verifySignature();
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const verifySignature = async () => {
    try {
      const response = await fetch(`/api/v1/evidence/${evidenceId}/verify`);

      if (!response.ok) {
        throw new Error('Failed to verify signature');
      }

      const result = await response.json();
      setVerificationResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md text-sm">
        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
        <span className="text-gray-600">Loading signature...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-md text-sm">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <span className="text-red-700">{error}</span>
      </div>
    );
  }

  if (!signatureInfo) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
        <FileKey className="h-4 w-4 text-yellow-600" />
        <span className="text-yellow-700">Not Signed</span>
      </div>
    );
  }

  const isValid = verificationResult?.overallValid ?? false;

  return (
    <div className="space-y-2">
      {/* Main Badge */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border transition-colors ${
          isValid
            ? 'bg-green-50 border-green-200 hover:bg-green-100'
            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        }`}
      >
        {isValid ? (
          <Shield className="h-4 w-4 text-green-600" />
        ) : (
          <FileKey className="h-4 w-4 text-blue-600" />
        )}
        <span className={isValid ? 'text-green-700 font-medium' : 'text-blue-700'}>
          {isValid ? 'Signature Verified' : 'Digitally Signed'}
        </span>
        {showDetails && (
          <span className="text-xs text-gray-500 ml-1">
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
          {/* Verification Status */}
          {verificationResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {verificationResult.signatureValid ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  Signature: {verificationResult.signatureValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {verificationResult.certificateValid ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  Certificate: {verificationResult.certificateValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              {verificationResult.details && (
                <p className="text-xs text-gray-600 mt-1">{verificationResult.details}</p>
              )}
            </div>
          )}

          {/* Signature Info */}
          <div className="border-t pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Artifact ID:</span>
                <div className="font-mono text-gray-900">{signatureInfo.artifactId}</div>
              </div>
              <div>
                <span className="text-gray-500">Certificate Serial:</span>
                <div className="font-mono text-gray-900 truncate">
                  {signatureInfo.certificateSerial}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>
                Signed: {new Date(signatureInfo.signedAt).toLocaleString()}
              </span>
            </div>

            <div className="text-xs text-gray-500">
              <div>Algorithm: {signatureInfo.algorithm}</div>
              <div>Hash: {signatureInfo.hashAlgorithm}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-3">
            <button
              onClick={verifySignature}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Re-verify Signature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple inline signature status indicator
 */
export function SignatureStatusIcon({ evidenceId }: { evidenceId: string }) {
  const [isSigned, setIsSigned] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/v1/evidence/${evidenceId}/signature-info`)
      .then(res => res.ok ? res.json() : null)
      .then(result => setIsSigned(result?.data?.isSigned ?? false))
      .catch(() => setIsSigned(false));
  }, [evidenceId]);

  if (isSigned === null) return null;

  return isSigned ? (
    <span title="Digitally Signed">
      <Shield className="h-4 w-4 text-green-600" />
    </span>
  ) : (
    <span title="Not Signed">
      <FileKey className="h-4 w-4 text-gray-400" />
    </span>
  );
}
