from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import database
from typing import List, Optional

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectResponse(BaseModel):
    project_id: str
    name: str
    description: str
    created_at: str

@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate):
    new_project = database.create_project(project.name, project.description)
    if not new_project:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return new_project

@router.get("/", response_model=List[ProjectResponse])
def list_projects():
    return database.get_projects()

@router.get("/{project_id}/scans")
def get_project_scans(project_id: str):
    return database.get_project_scans(project_id)

@router.delete("/{project_id}")
def delete_project(project_id: str):
    success = database.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or could not be deleted")
    return {"message": "Project deleted successfully"}
