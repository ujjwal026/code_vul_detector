import ProjectSidebar from "@/components/ProjectSidebar";
import { OllamaBadge } from "@/components/OllamaBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Brain, Shield, Database, Bell } from "lucide-react";
import { useState } from "react";

const Settings = () => {
  const [useOllama, setUseOllama] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Configure your security scanning preferences</p>
          </div>

          <div className="max-w-4xl space-y-6">
            {/* AI Configuration */}
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your on-premises AI model settings
                    </CardDescription>
                  </div>
                  {useOllama && <OllamaBadge />}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ollama-toggle">Use On-Prem Ollama</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable local AI model for enhanced privacy and security
                    </p>
                  </div>
                  <Switch
                    id="ollama-toggle"
                    checked={useOllama}
                    onCheckedChange={setUseOllama}
                  />
                </div>

                {useOllama && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="model">Model Version</Label>
                        <Select defaultValue="codellama">
                          <SelectTrigger id="model" className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="codellama">CodeLlama 13B</SelectItem>
                            <SelectItem value="codellama-7b">CodeLlama 7B (Faster)</SelectItem>
                            <SelectItem value="codellama-34b">CodeLlama 34B (More Accurate)</SelectItem>
                            <SelectItem value="mistral">Mistral 7B</SelectItem>
                            <SelectItem value="llama2">Llama 2 13B</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="endpoint">Ollama Endpoint</Label>
                        <Input
                          id="endpoint"
                          placeholder="http://localhost:11434"
                          defaultValue="http://localhost:11434"
                          className="mt-2"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Connection Status</p>
                          <p className="text-xs text-muted-foreground">Last checked: 2 minutes ago</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                          <span className="text-sm text-success font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Security Rules */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security Rules
                </CardTitle>
                <CardDescription>
                  Manage vulnerability detection and suppression rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable All CWE Checks</Label>
                    <p className="text-sm text-muted-foreground">
                      Scan for all Common Weakness Enumeration patterns
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable OWASP Top 10</Label>
                    <p className="text-sm text-muted-foreground">
                      Focus on OWASP Top 10 vulnerabilities
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Custom Rule Sets</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload and manage custom detection rules
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage Rules
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Data & Privacy
                </CardTitle>
                <CardDescription>
                  Configure data retention and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="retention">Scan History Retention</Label>
                  <Select defaultValue="90">
                    <SelectTrigger id="retention" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-delete Fixed Findings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically remove findings after they're marked as fixed
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Anonymous Usage Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Help improve the tool by sharing anonymous usage data
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure how you receive security alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Critical Findings</Label>
                    <p className="text-sm text-muted-foreground">
                      Immediate alerts for critical vulnerabilities
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Scan Complete</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when security scans finish
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly security status reports
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline">Reset to Defaults</Button>
              <Button className="glow-primary">Save Changes</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
