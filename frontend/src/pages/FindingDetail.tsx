import ProjectSidebar from "@/components/ProjectSidebar";
import { StatusPill } from "@/components/StatusPill";
import { OllamaBadge } from "@/components/OllamaBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, Copy, Sparkles, FileDiff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import ReactDiffViewer from 'react-diff-viewer-continued';

const FindingDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState<string | null>(null);

  const finding = location.state?.finding;

  if (!finding) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Finding not found</h2>
          <Button onClick={() => navigate("/findings")} className="mt-4">Back to Findings</Button>
        </div>
      </div>
    );
  }

  const handleFeedback = (type: string) => {
    setFeedback(type);
    toast.success("Feedback submitted!");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleAcceptFix = () => {
    toast.success("Fix accepted! (In a real app, this would apply the patch)");
    // Logic to apply fix would go here
  };

  // Construct original code snippet (mocked for now if not available)
  // In a real scenario, we'd fetch the file content around the vulnerable line
  const originalCode = finding.original_result?.code || `// Vulnerable code at line ${finding.line}\n// ... source code not available ...`;
  const fixedCode = finding.fixed_code || "// No fix generated";

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/findings")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Findings
            </Button>

            <Button
              className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20 animate-pulse"
              onClick={() => navigate("/fix-preview", { state: { finding } })}
            >
              <Sparkles className="h-4 w-4" />
              View AI Suggested Fix (PR View)
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{finding.title}</h1>
                <StatusPill severity={finding.severity} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">{finding.cwe}</span>
                <span>•</span>
                <span className="font-mono">{finding.file}:{finding.line}</span>
                <span>•</span>
                <span>Confidence: {finding.confidence}%</span>
              </div>
            </div>
            <OllamaBadge />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Vulnerability Details */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Vulnerability Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {finding.message}
                </p>
              </CardContent>
            </Card>

            {/* Diff Viewer */}
            <Card className="card-elevated border-primary/50 glow-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileDiff className="h-5 w-5 text-primary" />
                  Proposed Fix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-border">
                  <ReactDiffViewer
                    oldValue={originalCode}
                    newValue={fixedCode}
                    splitView={true}
                    useDarkTheme={true}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#1e1e1e',
                          diffViewerColor: '#FFF',
                          addedBackground: '#044B53',
                          addedColor: 'white',
                          removedBackground: '#632F34',
                          removedColor: 'white',
                          wordAddedBackground: '#055d67',
                          wordRemovedBackground: '#7d383f',
                          addedGutterBackground: '#034148',
                          removedGutterBackground: '#632b30',
                          gutterBackground: '#1e1e1e',
                          gutterColor: '#4a4a4a',
                        }
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => copyToClipboard(fixedCode)}>
                    <Copy className="h-4 w-4 mr-2" /> Copy Code
                  </Button>
                  <Button className="glow-primary" onClick={handleAcceptFix}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Accept Fix
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-lg">Developer Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant={feedback === "tp" ? "default" : "outline"}
                    className="flex-1 gap-2"
                    onClick={() => handleFeedback("tp")}
                  >
                    <CheckCircle className="h-4 w-4" />
                    True Positive
                  </Button>
                  <Button
                    variant={feedback === "fp" ? "default" : "outline"}
                    className="flex-1 gap-2"
                    onClick={() => handleFeedback("fp")}
                  >
                    <XCircle className="h-4 w-4" />
                    False Positive
                  </Button>
                  <Button
                    variant={feedback === "unsure" ? "default" : "outline"}
                    className="flex-1 gap-2"
                    onClick={() => handleFeedback("unsure")}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Not Sure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FindingDetail;
