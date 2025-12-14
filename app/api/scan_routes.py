from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, field_validator
from app.services import file_manager, orchestrator, database
import shutil
import os
import stat
import uuid
import asyncio

router = APIRouter(prefix="/scan", tags=["scan"])

class RepoRequest(BaseModel):
    repo_url: str
    project_id: str

    @field_validator('repo_url')
    @classmethod
    def clean_url(cls, v: str) -> str:
        return v.strip()

class TextRequest(BaseModel):
    content: str
    language: str
    project_id: str

def cleanup_temp_dir(path: str):
    """Cleanup temp directory, handling readonly files on Windows."""
    def handle_remove_readonly(func, path, exc):
        """Error handler for Windows readonly files."""
        os.chmod(path, stat.S_IWRITE)
        func(path)
    
    shutil.rmtree(path, onerror=handle_remove_readonly)

@router.post("/repo")
async def scan_repo(request: RepoRequest):
    scan_id = str(uuid.uuid4())
    temp_dir = None
    try:
        temp_dir = await file_manager.clone_repo(request.repo_url)
        results = await orchestrator.run_scans(temp_dir)
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, request.project_id, "repo", request.repo_url, results)
        
        return {"scan_id": scan_id, "results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.post("/text")
async def scan_text(request: TextRequest):
    scan_id = str(uuid.uuid4())
    temp_dir = None
    try:
        temp_dir = file_manager.save_text(request.content, request.language)
        results = await orchestrator.run_scans(temp_dir)
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, request.project_id, "text", "raw_content", results)
        
        return {"scan_id": scan_id, "results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.post("/file")
async def scan_file(project_id: str = Form(...), file: UploadFile = File(...)):
    scan_id = str(uuid.uuid4())
    temp_dir = None
    try:
        temp_dir = await file_manager.save_upload(file)
        results = await orchestrator.run_scans(temp_dir)
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, project_id, "file", file.filename, results)
        
        return {"scan_id": scan_id, "results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.get("/{scan_id}")
def get_scan_report(scan_id: str):
    report = database.get_scan(scan_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scan not found")
    return report

@router.get("/history/recent")
def get_scan_history(limit: int = 10):
    """Get the most recent scans."""
    return database.get_recent_scans(limit)
