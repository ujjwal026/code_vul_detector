import ProjectSidebar from "@/components/ProjectSidebar";
import { ScanCard } from "@/components/ScanCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_BASE}/scan/history/recent`);
        const scans = response.data;

        // Process scans for display
        const processedScans = scans.map((scan: any) => {
          const results = scan.results || [];
          const counts = { critical: 0, high: 0, medium: 0, low: 0 };

          // Map scanner severity levels to dashboard categories
          const mapSeverity = (severity: string): keyof typeof counts => {
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

          results.forEach((r: any) => {
            const mappedSeverity = mapSeverity(r.severity);
            counts[mappedSeverity]++;
          });

          return {
            id: scan.scan_id,
            project: scan.repo_name || scan.target || "Unknown Target",
            date: new Date(scan.timestamp).toLocaleString(),
            findings: results.length,
            ...counts,
            raw_results: results // Store for navigation
          };
        });

        setRecentScans(processedScans);

        // Calculate global stats
        const globalStats = { critical: 0, high: 0, medium: 0, low: 0 };
        processedScans.forEach((s: any) => {
          globalStats.critical += s.critical;
          globalStats.high += s.high;
          globalStats.medium += s.medium;
          globalStats.low += s.low;
        });
        setStats(globalStats);

      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-2">Security scan overview and project insights</p>
            </div>
            <Button
              size="lg"
              className="gap-2 glow-primary hover:scale-105 transition-smooth"
              onClick={() => navigate("/scan")}
            >
              <Play className="h-4 w-4" />
              Start New Scan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScanCard severity="critical" count={stats.critical} title="Critical Issues" />
            <ScanCard severity="high" count={stats.high} title="High Severity" />
            <ScanCard severity="medium" count={stats.medium} title="Medium Severity" />
            <ScanCard severity="low" count={stats.low} title="Low Severity" />
          </div>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Total Findings</TableHead>
                      <TableHead className="text-center">Critical</TableHead>
                      <TableHead className="text-center">High</TableHead>
                      <TableHead className="text-center">Medium</TableHead>
                      <TableHead className="text-center">Low</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentScans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No scans found. Start your first scan!
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentScans.map((scan) => (
                        <TableRow
                          key={scan.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate("/findings", { state: { results: scan.raw_results, scanId: scan.id } })}
                        >
                          <TableCell className="font-medium truncate max-w-[200px]" title={scan.project}>
                            {scan.project}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{scan.date}</TableCell>
                          <TableCell className="text-center font-semibold">{scan.findings}</TableCell>
                          <TableCell className="text-center">
                            {scan.critical > 0 && <span className="text-critical font-semibold">{scan.critical}</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {scan.high > 0 && <span className="text-destructive font-semibold">{scan.high}</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {scan.medium > 0 && <span className="text-warning font-semibold">{scan.medium}</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {scan.low > 0 && <span className="text-secondary font-semibold">{scan.low}</span>}
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
