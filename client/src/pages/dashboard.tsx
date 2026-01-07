import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { OneClickAuthentication } from "@/components/authentication/OneClickAuthentication";
import { EvidenceCard } from "@/components/ui/evidence-card";
import ChittyBeaconWidget from "@/components/beacon/ChittyBeaconWidget";
import { QuickShareButton } from "@/components/sharing/QuickShareButton";
import { Shield, FileCheck, Zap } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-1");

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: currentCase } = useQuery({
    queryKey: ["/api/cases", selectedCaseId],
    enabled: !!selectedCaseId,
  });

  const { data: evidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ["/api/cases", selectedCaseId, "evidence"],
    enabled: !!selectedCaseId,
  });


  if (casesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg text-muted-foreground">Loading ChittyVerify...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Clean Hero Section */}
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
              Immutable evidence verification with cryptographic proof - securing legal documents before blockchain commitment
            </p>
            
            <OneClickAuthentication />
          </div>
        </div>
      </section>

      {/* ChittyBeacon Integration */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <ChittyBeaconWidget />
        </div>
      </section>

      {/* Evidence Dashboard */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold text-foreground">Evidence Vault</h2>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Zap className="w-5 h-5 mr-2" />
              Upload Evidence
            </Button>
          </div>

          {evidenceLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-8 animate-pulse">
                  <div className="w-full h-32 bg-muted rounded-lg mb-6"></div>
                  <div className="w-3/4 h-6 bg-muted rounded mb-3"></div>
                  <div className="w-1/2 h-4 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : evidence && Array.isArray(evidence) && evidence.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {evidence.map((item: any, index: number) => (
                <EvidenceCard 
                  key={item.id} 
                  evidence={item}
                />
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
                Upload your first document to create immutable verification records with cryptographic proof
              </p>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Zap className="w-5 h-5 mr-2" />
                Upload First Evidence
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}