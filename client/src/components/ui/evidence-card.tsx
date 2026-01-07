import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustIndicator } from "./trust-indicator";
import { Eye, Share2, Download, Clock, CheckCircle, AlertTriangle, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { QuickShareButton } from "@/components/sharing/QuickShareButton";

interface EvidenceCardProps {
  evidence: {
    id: string;
    artifactId: string;
    title: string;
    description?: string;
    type: string;
    subtype?: string;
    status: string;
    trustScore: number;
    uploadTimestamp?: string;
    uploadedAt?: string;
    evidenceTier?: string;
    verifyStatus?: string;
    metadata?: Record<string, any>;
    facts?: Record<string, any>;
    analysis?: {
      confidence?: number;
      keyFindings?: string[];
    };
    blockchain?: {
      status: string;
      hash?: string;
      blockNumber?: number;
    };
  };
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const getEvidenceTypeColor = (type: string) => {
    switch (type) {
      case "document": return "bg-evidence-document";
      case "property_tax": return "bg-evidence-financial";
      case "communication": return "bg-evidence-communication";
      case "financial": return "bg-evidence-financial";
      case "legal": return "bg-evidence-legal";
      case "image": return "bg-evidence-image";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-status-verified" />;
      case "pending":
        return <Clock className="w-4 h-4 text-status-pending" />;
      case "minted":
        return <LinkIcon className="w-4 h-4 text-status-minted" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-status-failed" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-status-verified/10 text-status-verified";
      case "pending": return "bg-status-pending/10 text-status-pending";
      case "minted": return "bg-status-minted/10 text-status-minted";
      default: return "bg-status-failed/10 text-status-failed";
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case "property_tax": return "fa-home";
      case "communication": return "fa-envelope";
      case "financial": return "fa-chart-line";
      case "legal": return "fa-gavel";
      case "image": return "fa-image";
      default: return "fa-file-alt";
    }
  };

  return (
    <Card className="bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <i className={`fas ${getEvidenceIcon(evidence.type)} text-primary text-xl`}></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-card-foreground mb-1">{evidence.title}</h3>
              <p className="text-sm text-muted-foreground font-mono">{evidence.artifactId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className={`${getStatusColor(evidence.status)} font-medium px-3 py-1`}>
              {getStatusIcon(evidence.status)}
              <span className="ml-2 capitalize">{evidence.status}</span>
            </Badge>
            <TrustIndicator score={evidence.trustScore} />
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Upload Date</p>
            <p className="font-semibold text-card-foreground">{new Date(evidence.uploadTimestamp || evidence.uploadedAt || new Date()).toLocaleDateString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</p>
            <p className="font-semibold text-card-foreground capitalize">{evidence.type.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Blockchain Status */}
        {evidence.blockchain && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Chain Status</p>
            <p className="font-medium text-status-minted flex items-center">
              <LinkIcon className="w-4 h-4 mr-1" />
              {evidence.blockchain.status.charAt(0).toUpperCase() + evidence.blockchain.status.slice(1)}
            </p>
            {evidence.blockchain.blockNumber && (
              <p className="text-xs text-gray-500 mt-1">Block #{evidence.blockchain.blockNumber}</p>
            )}
          </div>
        )}

        {/* Facts Preview */}
        {evidence.facts && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Facts Extracted</h4>
            <ul className="space-y-1">
              {Object.entries(evidence.facts).slice(0, 3).map(([key, value]) => (
                <li key={key} className="text-sm text-blue-800">
                  • {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {String(value)}
                </li>
              ))}
              {Object.keys(evidence.facts).length > 3 && (
                <li className="text-sm text-blue-600 italic">
                  +{Object.keys(evidence.facts).length - 3} more facts...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Analysis Preview */}
        {evidence.analysis && evidence.analysis.keyFindings && (
          <div className="bg-purple-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">AI Analysis</h4>
            {evidence.analysis.confidence && (
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex-1 bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${evidence.analysis.confidence * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-purple-900">
                  {Math.round(evidence.analysis.confidence * 100)}%
                </span>
              </div>
            )}
            <ul className="space-y-1">
              {evidence.analysis.keyFindings.slice(0, 2).map((finding, index) => (
                <li key={index} className="text-sm text-purple-800">• {finding}</li>
              ))}
              {evidence.analysis.keyFindings.length > 2 && (
                <li className="text-sm text-purple-600 italic">
                  +{evidence.analysis.keyFindings.length - 2} more insights...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Link href={`/evidence/${evidence.id}`} className="flex-1">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </Link>
          <QuickShareButton
            evidenceId={evidence.id}
            evidenceTitle={evidence.title}
            evidenceType={evidence.type}
            size="default"
            variant="outline"
          />
          <Button 
            variant="outline" 
            size="default"
            className="px-4 h-11"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
