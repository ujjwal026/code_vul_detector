import ProjectSidebar from "@/components/ProjectSidebar";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, FileCode, Folder, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

const Findings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // If navigated with specific results (from a fresh scan), show them immediately
  useEffect(() => {
    const init = async () => {
      if (location.state?.results) {
        // Fresh scan results
        setSelectedProject({ name: "Current Scan Results", project_id: "temp" });
        mapFindings(location.state.results);
      } else {
        // Load projects first
        const loadedProjects = await fetchProjects();

        // Check if we navigated here with a specific project ID (e.g. from sidebar)
        if (location.state?.projectId) {
          const targetId = location.state.projectId;
          const targetProject = loadedProjects.find((p: any) => p.project_id === targetId);
          if (targetProject) {
            setSelectedProject(targetProject);
            fetchProjectFindings(targetId);
          }
        }
      }
    };
    init();
  }, [location.state]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects/`);
      setProjects(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch projects", error);
      return [];
    }
  };

  const fetchProjectFindings = async (projectId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/projects/${projectId}/scans`);
      const scans = response.data;
      // Aggregate all findings from all scans of this project
      let allFindings: any[] = [];
      scans.forEach((scan: any) => {
        if (scan.results) {
          allFindings = [...allFindings, ...scan.results];
        }
      });
      mapFindings(allFindings);
    } catch (error) {
      console.error("Failed to fetch findings", error);
    } finally {
      setLoading(false);
    }
  };

  // Map scanner severity levels to display categories
  const mapSeverity = (severity: string): string => {
    const sev = (severity || "medium").toLowerCase();
    switch (sev) {
      case "error":
      case "critical":
        return "critical";
      case "high":
        return "high";
      case "warning":
      case "medium":
        return "medium";
      case "info":
      case "low":
        return "low";
      default:
        return "medium";
    }
  };

  const mapFindings = (rawFindings: any[]) => {
    const mapped = rawFindings.map((res: any, index: number) => ({
      id: index.toString(),
      cwe: res.cwe || "Unknown",
      severity: mapSeverity(res.severity),
      file: res.file,
      line: res.line,
      confidence: 90,
      status: "open",
      title: res.vuln || res.message?.slice(0, 50) || "Vulnerability",
      message: res.message,
      fixed_code: res.fixed_code,
      original_result: res
    }));
    setFindings(mapped);
  };

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    fetchProjectFindings(project.project_id);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Security Findings</h1>
            <p className="text-muted-foreground mt-2">
              {selectedProject ? `Viewing findings for ${selectedProject.name}` : "Select a project to view findings"}
            </p>
          </div>

          {!selectedProject ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card
                  key={project.project_id}
                  className="card-elevated hover:border-primary cursor-pointer transition-all"
                  onClick={() => handleProjectClick(project)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      {project.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{project.description || "No description"}</p>
                    <p className="text-xs text-muted-foreground mt-4">Created: {new Date(project.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setSelectedProject(null)} className="mb-4 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Projects
              </Button>

              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-primary" />
                    Findings ({findings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CWE</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {findings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loading ? "Loading findings..." : "No findings available for this project."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        findings.map((finding) => (
                          <TableRow
                            key={finding.id}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => navigate(`/findings/${finding.id}`, { state: { finding } })}
                          >
                            <TableCell className="font-mono text-sm">{finding.cwe}</TableCell>
                            <TableCell>
                              <StatusPill severity={finding.severity} />
                            </TableCell>
                            <TableCell className="font-medium">{finding.title}</TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {finding.file}:{finding.line}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2 max-w-[60px]">
                                  <div
                                    className="bg-primary h-full rounded-full"
                                    style={{ width: `${finding.confidence}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold">{finding.confidence}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${finding.status === "open" ? "bg-red-500/20 text-red-500" :
                                finding.status === "reviewing" ? "bg-yellow-500/20 text-yellow-500" :
                                  "bg-green-500/20 text-green-500"
                                }`}>
                                {finding.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Findings;
