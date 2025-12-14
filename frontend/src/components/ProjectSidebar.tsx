import { Shield, Home, Search, Upload, Settings, FolderOpen, Trash2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";

const ProjectSidebar = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const navigate = useNavigate();

  
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (!confirm("Are you sure you want to delete this project and all its scans?")) return;

    try {
      await axios.delete(`${API_BASE}/projects/${projectId}`);
      toast.success("Project deleted");
      fetchProjects(); // Refresh list
    } catch (error) {
      console.error("Failed to delete project", error);
      toast.error("Failed to delete project");
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate("/findings", { state: { projectId } });
  };

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar h-screen flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">SecureCode AI</span>
        </div>
      </div>

      <nav className="p-4 space-y-1">
        <NavLink
          to="/"
          end
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/findings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <Search className="h-4 w-4" />
          <span>Findings</span>
        </NavLink>
        <NavLink
          to="/scan"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <Upload className="h-4 w-4" />
          <span>New Scan</span>
        </NavLink>
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth"
          activeClassName="bg-sidebar-accent text-primary font-medium"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="flex-1 overflow-hidden">
        <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Projects
        </div>
        <ScrollArea className="h-full">
          <div className="px-4 space-y-1 pb-4">
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3">No projects yet.</p>
            ) : (
              projects.map((project) => (
                <div
                  key={project.project_id}
                  onClick={() => handleProjectClick(project.project_id)}
                  className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth cursor-pointer relative"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="font-medium truncate">{project.name}</div>
                    {project.description && <div className="text-xs text-muted-foreground truncate">{project.description}</div>}
                  </div>
                  <button
                    onClick={(e) => handleDeleteProject(e, project.project_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all absolute right-2"
                    title="Delete Project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};

export default ProjectSidebar;
