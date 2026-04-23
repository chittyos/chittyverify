import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EvidenceCard } from "@/components/ui/evidence-card";
import { Shield, FileCheck, Zap, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { toEvidenceCard, type EvidenceDocument } from "@/lib/adapters";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/documents"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/documents?limit=50");
      return res.json() as Promise<{ documents: EvidenceDocument[]; meta: { count: number } }>;
    },
  });

  const { data: pipelineStatus } = useQuery({
    queryKey: ["/pipe/status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/pipe/status"));
      if (!res.ok) return null;
      return res.json();
    },
  });

  const evidence = data?.documents?.map(toEvidenceCard) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-6xl font-bold">
                <span className="text-foreground">Chitty</span>
                <span className="text-primary">Verify</span>
              </h1>
            </div>

            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              AI-powered evidence verification with 12-step document processing pipeline
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Status */}
      {pipelineStatus && (
        <section className="py-4 border-b border-border/30">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Pipeline: <strong className="text-foreground">{pipelineStatus.status}</strong></span>
              {pipelineStatus.pendingBatches && (
                <>
                  <span>Collection queue: {pipelineStatus.pendingBatches.collection}</span>
                  <span>Preservation queue: {pipelineStatus.pendingBatches.preservation}</span>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Evidence Dashboard */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold text-foreground">
              Evidence Vault
              {data?.meta && (
                <span className="text-lg font-normal text-muted-foreground ml-4">
                  {data.meta.count} documents
                </span>
              )}
            </h2>
            <Link href="/upload">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Zap className="w-5 h-5 mr-2" />
                Upload Evidence
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-8 animate-pulse">
                  <div className="w-full h-32 bg-muted rounded-lg mb-6"></div>
                  <div className="w-3/4 h-6 bg-muted rounded mb-3"></div>
                  <div className="w-1/2 h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : evidence.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {evidence
                .filter((item) =>
                  !searchQuery ||
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.type.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <EvidenceCard key={item.id} evidence={item} />
                ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-16 text-center">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileCheck className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-foreground mb-4">Ready to Verify Evidence</h3>
              <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
                Upload your first document to start the AI-powered verification pipeline
              </p>
              <Link href="/upload">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Zap className="w-5 h-5 mr-2" />
                  Upload First Evidence
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
