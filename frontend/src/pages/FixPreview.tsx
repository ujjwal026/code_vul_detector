import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, FileCode, GitPullRequest, Split, MessageSquare } from "lucide-react";
import ReactDiffViewer from 'react-diff-viewer-continued';
import { toast } from "sonner";

const FixPreview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const finding = location.state?.finding;

    if (!finding) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No finding data found</h2>
                    <Button onClick={() => navigate("/findings")} className="mt-4">Back to Findings</Button>
                </div>
            </div>
        );
    }

    const originalCode = finding.original_result?.code || `// Vulnerable code at line ${finding.line}\n// ... source code not available ...`;
    const fixedCode = finding.fixed_code || "// No fix generated";

    const handleAccept = () => {
        toast.success("Fix accepted and merged! (Simulation)");
        setTimeout(() => navigate("/findings"), 1500);
    };

    return (
        <div className="min-h-screen bg-[#0d1117] text-white font-sans">
            {/* Header mimicking GitHub PR */}
            <div className="border-b border-gray-700 bg-[#161b22] p-4 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold flex items-center gap-2">
                                <GitPullRequest className="h-5 w-5 text-green-500" />
                                Fix: {finding.title} <span className="text-gray-500 font-normal">#{finding.id}</span>
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">Open</span>
                                <span>AI Agent wants to merge 1 commit into <span className="font-mono text-blue-400">main</span> from <span className="font-mono text-blue-400">fix/security-patch</span></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                            <MessageSquare className="h-4 w-4 mr-2" /> Comment
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white border-none" onClick={handleAccept}>
                            <Check className="h-4 w-4 mr-2" /> Merge Fix
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* File Header */}
                <div className="bg-[#161b22] border border-gray-700 rounded-t-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                            <FileCode className="h-4 w-4" />
                            {finding.file}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/50 rounded-sm"></span> Original</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500/50 rounded-sm"></span> Fixed</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400">
                                <Split className="h-3 w-3 mr-1" /> Split
                            </Button>
                        </div>
                    </div>

                    {/* Diff Viewer */}
                    <div className="overflow-x-auto">
                        <ReactDiffViewer
                            oldValue={originalCode}
                            newValue={fixedCode}
                            splitView={true}
                            useDarkTheme={true}
                            styles={{
                                variables: {
                                    dark: {
                                        diffViewerBackground: '#0d1117',
                                        diffViewerColor: '#c9d1d9',
                                        addedBackground: 'rgba(46, 160, 67, 0.15)',
                                        addedColor: '#c9d1d9',
                                        removedBackground: 'rgba(248, 81, 73, 0.15)',
                                        removedColor: '#c9d1d9',
                                        wordAddedBackground: 'rgba(46, 160, 67, 0.4)',
                                        wordRemovedBackground: 'rgba(248, 81, 73, 0.4)',
                                        addedGutterBackground: 'rgba(46, 160, 67, 0.15)',
                                        removedGutterBackground: 'rgba(248, 81, 73, 0.15)',
                                        gutterBackground: '#0d1117',
                                        gutterColor: '#484f58',
                                        codeFoldGutterBackground: '#161b22',
                                        emptyLineBackground: '#161b22',
                                    }
                                },
                                line: {
                                    padding: '2px 0',
                                    fontSize: '12px',
                                    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                                    lineHeight: '1.5',
                                },
                                gutter: {
                                    minWidth: '50px',
                                    padding: '0 10px',
                                    textAlign: 'right',
                                    color: '#484f58',
                                }
                            }}
                        />
                    </div>
                </div>

                <Card className="bg-[#161b22] border-gray-700 p-4 text-gray-300">
                    <h3 className="font-semibold mb-2 text-white">AI Analysis</h3>
                    <p className="text-sm leading-relaxed">
                        {finding.message}
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default FixPreview;
