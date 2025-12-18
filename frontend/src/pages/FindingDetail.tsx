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
  const [showFullCode, setShowFullCode] = useState(false);

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

  // Get the actual code snippets from the finding
  const originalCode = finding.original_code || `// Vulnerable code at line ${finding.line}\n// ... source code not available ...`;
  const fixedCode = finding.fixed_code || "// No fix generated";

  // Extract only changed lines for compact diff view
  const getChangedLinesOnly = (original: string, fixed: string): { original: string; fixed: string; changedLines: number[] } => {
    const originalLines = original.split('\n');
    const fixedLines = fixed.split('\n');
    const changedLines: number[] = [];
    
    // Simple line-by-line comparison
    for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
      if ((originalLines[i] || '') !== (fixedLines[i] || '')) {
        changedLines.push(i);
      }
    }
    
    // If too many changes, show all
    if (changedLines.length > 20) {
      return { original, fixed, changedLines: [] };
    }
    
    // Create focused snippets with context around changes
    if (changedLines.length > 0) {
      const minLine = Math.max(0, Math.min(...changedLines) - 2);
      const maxLine = Math.min(Math.max(originalLines.length, fixedLines.length) - 1, Math.max(...changedLines) + 2);
      
      const focusedOriginal = originalLines.slice(minLine, maxLine + 1).join('\n');
      const focusedFixed = fixedLines.slice(minLine, maxLine + 1).join('\n');
      
      return { 
        original: focusedOriginal, 
        fixed: focusedFixed, 
        changedLines: changedLines.map(l => l - minLine).filter(l => l >= 0 && l <= maxLine - minLine)
      };
    }
    
    return { original, fixed, changedLines };
  };

  const { original: displayOriginal, fixed: displayFixed, changedLines } = getChangedLinesOnly(originalCode, fixedCode);

  // Choose between full code and focused changes
  const codeToDisplay = showFullCode 
    ? { original: originalCode, fixed: fixedCode }
    : { original: displayOriginal, fixed: displayFixed };

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
              View PR
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
              </div>
            </div>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileDiff className="h-5 w-5 text-primary" />
                    Proposed Fix {!showFullCode && changedLines.length > 0 && <span className="text-xs font-normal text-muted-foreground ml-2">({changedLines.length} changed lines)</span>}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullCode(!showFullCode)}
                  >
                    {showFullCode ? "Show Changes Only" : "Show Full Code"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <style>{`
                  .diff-viewer-line {
                    line-height: 1.5 !important;
                    padding-top: 0.5rem !important;
                    padding-bottom: 0.5rem !important;
                    margin: 0 !important;
                  }
                  .diff-viewer-gutter {
                    padding: 0.5rem 0.5rem !important;
                  }
                  .diff-added,
                  .diff-removed {
                    margin: 0.1rem 0 !important;
                  }
                `}</style>
                <div className="rounded-lg overflow-hidden border border-border">
                  <ReactDiffViewer
                    oldValue={codeToDisplay.original}
                    newValue={codeToDisplay.fixed}
                    splitView={true}
                    useDarkTheme={true}
                    hideLineNumbers={false}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#1e1e1e',
                          diffViewerColor: '#FFF',
                          addedBackground: '#044B53',
                          addedColor: '#90EE90',
                          removedBackground: '#632F34',
                          removedColor: '#FF6B6B',
                          wordAddedBackground: '#044B53',
                          wordRemovedBackground: '#632F34',
                          addedGutterBackground: '#034148',
                          removedGutterBackground: '#632b30',
                          gutterBackground: '#1e1e1e',
                          gutterColor: '#4a4a4a',
                        }
                      },
                      line: {
                        padding: '0.5rem 0.75rem',
                        lineHeight: '1.5',
                        minHeight: 'auto',
                        margin: '0',
                      },
                      gutter: {
                        padding: '0.5rem 0.5rem',
                        minWidth: '3rem',
                      },
                      wordDiff: {
                        padding: '0',
                        margin: '0',
                        borderRadius: '0',
                      },
                      contentText: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md space-y-1">
                  <p className="flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded"></span> Red = Removed/Vulnerable code</p>
                  <p className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded"></span> Green = Added/Fixed code</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => copyToClipboard(codeToDisplay.fixed)}>
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
