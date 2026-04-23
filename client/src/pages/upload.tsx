import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, CheckCircle, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/api";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify({
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: file.type,
      }));

      const token = localStorage.getItem("chitty_auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(apiUrl("/documents"), {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Document Uploaded",
        description: `${data.document?.file_name || "Document"} has been queued for processing.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/documents"] });
      setUploadComplete(true);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      uploadMutation.mutate(file);
    }
  };

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Document Queued for Processing</h2>
              <p className="text-gray-600 mb-8">
                Your document is now in the 12-step AI verification pipeline.
                OCR, classification, entity extraction, and fact analysis will run automatically.
              </p>
              <div className="flex justify-center space-x-4">
                <Link href="/">
                  <Button>Return to Dashboard</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadComplete(false);
                    setUploadedFile(null);
                  }}
                >
                  Upload Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Evidence</h1>
          <p className="text-gray-600">
            Upload a document to start the AI-powered verification pipeline
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UploadIcon className="w-6 h-6 mr-2 text-blue-600" />
              Select Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.eml,.msg,.csv,.xlsx"
                disabled={uploadMutation.isPending}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploadMutation.isPending ? (
                  <>
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Uploading...</h3>
                    <p className="text-gray-500">{uploadedFile?.name}</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Choose a file to upload</h3>
                    <p className="text-gray-500 mb-4">
                      Drag and drop your file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-400">
                      Supported: PDF, DOC, TXT, JPG, PNG, EML, CSV, XLSX
                    </p>
                  </>
                )}
              </label>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
