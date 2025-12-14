import ProjectSidebar from "@/components/ProjectSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Code, GitBranch, Play, Loader2, AlertCircle, FolderPlus, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

const Scan = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // State for inputs
  const [textInput, setTextInput] = useState("");
  const [language, setLanguage] = useState("python");
  const [repoUrl, setRepoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Failed to load projects. Is the backend running?");
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Project name cannot be empty");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/projects/`, { name: newProjectName });
      if (response.data && response.data.project_id) {
        setProjects([response.data, ...projects]);
        setSelectedProjectId(response.data.project_id);
        setIsCreatingProject(false);
        setNewProjectName("");
        toast.success(`Project "${response.data.name}" created!`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Create project failed", error);
      toast.error("Failed to create project. Please try again.");
    }
  };

  const handleScan = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first.");
      return;
    }

    setIsScanning(true);
    let endpoint = "";
    let payload: any = {};
    let headers = { "Content-Type": "application/json" };

    try {
      if (activeTab === "paste") {
        if (!textInput.trim()) {
          toast.error("Please paste some code first.");
          setIsScanning(false);
          return;
        }
        endpoint = "/scan/text";
        payload = { content: textInput, language: language, project_id: selectedProjectId };
      } else if (activeTab === "git") {
        if (!repoUrl.trim()) {
          toast.error("Please enter a repository URL.");
          setIsScanning(false);
          return;
        }
        endpoint = "/scan/repo";
        payload = { repo_url: repoUrl, project_id: selectedProjectId };
      } else if (activeTab === "upload") {
        if (!file) {
          toast.error("Please select a file to upload.");
          setIsScanning(false);
          return;
        }
        endpoint = "/scan/file";
        const formData = new FormData();
        formData.append("file", file);
        formData.append("project_id", selectedProjectId);
        payload = formData;
        headers = { "Content-Type": "multipart/form-data" };
      }

      toast.info("Scan started... this may take a moment.");

      const response = await axios.post(`${API_BASE}${endpoint}`, payload, { headers });

      toast.success("Scan completed successfully!");

      // Navigate to findings page with the results
      navigate("/findings", {
        state: {
          results: response.data.results,
          scanId: response.data.scan_id
        }
      });

    } catch (error: any) {
      console.error("Scan failed:", error);
      toast.error(error.response?.data?.detail || "An error occurred during scanning.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">New Security Scan</h1>
            <p className="text-muted-foreground mt-2">Select a project to start scanning</p>
          </div>

          <div className="max-w-4xl space-y-6">
            {!selectedProjectId ? (
              /* Project Selection Card */
              <Card className="card-elevated border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>1. Select Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                      <Label>Project</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">No projects found</div>
                          ) : (
                            projects.map((p) => (
                              <SelectItem key={p.project_id} value={p.project_id}>{p.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pb-2 text-sm text-muted-foreground font-medium px-2 hidden md:block">OR</div>

                    <div className="flex-1 w-full">
                      {isCreatingProject ? (
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-2">
                            <Label>New Project Name</Label>
                            <Input
                              placeholder="My Awesome App"
                              value={newProjectName}
                              onChange={(e) => setNewProjectName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                              autoFocus
                            />
                          </div>
                          <Button onClick={handleCreateProject} size="icon" className="mb-0.5 shrink-0">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => setIsCreatingProject(false)} size="icon" className="mb-0.5 shrink-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full mb-0.5" onClick={() => setIsCreatingProject(true)}>
                          <FolderPlus className="mr-2 h-4 w-4" /> Create New Project
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Selected Project Header */
              <div className="flex items-center justify-between bg-card/50 p-4 rounded-lg border border-border/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <FolderPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Project</p>
                    <p className="font-semibold text-lg">{projects.find(p => p.project_id === selectedProjectId)?.name || "Unknown Project"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedProjectId("")}>
                  Change Project
                </Button>
              </div>
            )}

            {/* Scan Configuration Card - HIDDEN until project selected */}
            {selectedProjectId && (
              <Card className="card-elevated border-border/50 bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader>
                  <CardTitle>2. Configure Scan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="upload" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                      <TabsTrigger value="upload" className="gap-2 data-[state=active]:bg-background">
                        <Upload className="h-4 w-4" />
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="paste" className="gap-2 data-[state=active]:bg-background">
                        <Code className="h-4 w-4" />
                        Paste Code
                      </TabsTrigger>
                      <TabsTrigger value="git" className="gap-2 data-[state=active]:bg-background">
                        <GitBranch className="h-4 w-4" />
                        Git Repository
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4 mt-6">
                      <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-all cursor-pointer bg-muted/10 relative">
                        <input
                          type="file"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">
                          {file ? file.name : "Drop files here or click to browse"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supports individual source files
                        </p>
                        <Button variant="outline" className="mt-4 pointer-events-none">
                          Select Files
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="paste" className="space-y-4 mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Language</Label>
                          <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="python">Python</SelectItem>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                              <SelectItem value="typescript">TypeScript</SelectItem>
                              <SelectItem value="java">Java</SelectItem>
                              <SelectItem value="cpp">C++</SelectItem>
                              <SelectItem value="c">C</SelectItem>
                              <SelectItem value="go">Go</SelectItem>
                              <SelectItem value="php">PHP</SelectItem>
                              <SelectItem value="ruby">Ruby</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="code">Paste your code</Label>
                        <Textarea
                          id="code"
                          placeholder="Paste your source code here..."
                          className="min-h-[300px] font-mono text-sm mt-2 bg-muted/20"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="git" className="space-y-4 mt-6">
                      <div>
                        <Label htmlFor="git-url">Repository URL</Label>
                        <Input
                          id="git-url"
                          placeholder="https://github.com/username/repository.git"
                          className="mt-2 bg-muted/20"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="pt-6 border-t border-border space-y-4">
                    <Button
                      size="lg"
                      className="w-full gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                      onClick={handleScan}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" />
                          Start Security Scan
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scan;
