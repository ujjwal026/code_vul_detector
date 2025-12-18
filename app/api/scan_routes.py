from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from pydantic import BaseModel, field_validator
from app.services import file_manager, orchestrator, database
from app.services.logger import log_scan_event
import shutil
import os
import stat
import uuid
import asyncio

router = APIRouter(prefix="/scan", tags=["scan"])

# Store scan results to retrieve later
_scan_results = {}

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

async def _run_scan_repo(scan_id: str, project_id: str, repo_url: str):
    """Background task to run repository scan."""
    temp_dir = None
    try:
        temp_dir = await file_manager.clone_repo(repo_url)
        await log_scan_event(scan_id, f"📦 Repository cloned successfully", "success", {"temp_dir": temp_dir})
        
        results = await orchestrator.run_scans(temp_dir, scan_id)
        await log_scan_event(scan_id, f"✅ Scan completed - {len(results)} findings detected", "success", {"findings_count": len(results)})
        
        # Store results
        _scan_results[scan_id] = {"results": results, "status": "completed"}
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, project_id, "repo", repo_url, results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        await log_scan_event(scan_id, f"❌ Scan failed: {str(e)}", "error")
        _scan_results[scan_id] = {"error": str(e), "status": "failed"}
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.post("/repo")
async def scan_repo(request: RepoRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    
    await log_scan_event(scan_id, f"🚀 Starting repository scan", "info", {"source": request.repo_url})
    
    # Add scan to background tasks
    background_tasks.add_task(_run_scan_repo, scan_id, request.project_id, request.repo_url)
    
    # Return scan_id immediately
    return {"scan_id": scan_id, "status": "scanning"}

async def _run_scan_text(scan_id: str, project_id: str, content: str, language: str):
    """Background task to run text scan."""
    temp_dir = None
    try:
        temp_dir = file_manager.save_text(content, language)
        await log_scan_event(scan_id, f"💾 Code saved to temporary directory", "success")
        
        results = await orchestrator.run_scans(temp_dir, scan_id)
        await log_scan_event(scan_id, f"✅ Scan completed - {len(results)} findings detected", "success", {"findings_count": len(results)})
        
        # Store results
        _scan_results[scan_id] = {"results": results, "status": "completed"}
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, project_id, "text", "raw_content", results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        await log_scan_event(scan_id, f"❌ Scan failed: {str(e)}", "error")
        _scan_results[scan_id] = {"error": str(e), "status": "failed"}
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.post("/text")
async def scan_text(request: TextRequest, background_tasks: BackgroundTasks):
    scan_id = str(uuid.uuid4())
    
    await log_scan_event(scan_id, f"🚀 Starting text/code scan", "info", {"language": request.language})
    
    # Add scan to background tasks
    background_tasks.add_task(_run_scan_text, scan_id, request.project_id, request.content, request.language)
    
    # Return scan_id immediately
    return {"scan_id": scan_id, "status": "scanning"}

async def _run_scan_file(scan_id: str, project_id: str, filename: str, temp_dir: str):
    """Background task to run file scan."""
    try:
        results = await orchestrator.run_scans(temp_dir, scan_id)
        await log_scan_event(scan_id, f"✅ Scan completed - {len(results)} findings detected", "success", {"findings_count": len(results)})
        
        # Store results
        _scan_results[scan_id] = {"results": results, "status": "completed"}
        
        # Save to Database (Non-blocking)
        await asyncio.to_thread(database.save_scan, scan_id, project_id, "file", filename, results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        await log_scan_event(scan_id, f"❌ Scan failed: {str(e)}", "error")
        _scan_results[scan_id] = {"error": str(e), "status": "failed"}
    finally:
        if temp_dir and os.path.exists(temp_dir):
            cleanup_temp_dir(temp_dir)

@router.post("/file")
async def scan_file(project_id: str = Form(...), file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    scan_id = str(uuid.uuid4())
    
    try:
        await log_scan_event(scan_id, f"🚀 Starting file scan: {file.filename}", "info", {"filename": file.filename})
        
        temp_dir = await file_manager.save_upload(file)
        await log_scan_event(scan_id, f"📁 File uploaded successfully", "success", {"filename": file.filename})
        
        if background_tasks is None:
            background_tasks = BackgroundTasks()
        
        # Add scan to background tasks
        background_tasks.add_task(_run_scan_file, scan_id, project_id, file.filename, temp_dir)
        
        # Return scan_id immediately
        return {"scan_id": scan_id, "status": "scanning"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        await log_scan_event(scan_id, f"❌ Scan failed: {str(e)}", "error")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{scan_id}/status")
async def get_scan_status(scan_id: str):
    """Get the status and results of a scan."""
    if scan_id in _scan_results:
        return _scan_results[scan_id]
    # If not in memory, try to get from database
    report = database.get_scan(scan_id)
    if report:
        return {"results": report.get("results", []), "status": "completed"}
    return {"status": "scanning", "message": "Scan is still in progress"}

@router.get("/{scan_id}")

def get_scan_report(scan_id: str):
    report = database.get_scan(scan_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scan not found")
    return report

@router.get("/{scan_id}/logs")
async def get_scan_logs(scan_id: str):
    """Get all logs for a specific scan."""
    from app.services.logger import logger_service
    logs = await logger_service.get_logs(scan_id)
    return {"scan_id": scan_id, "logs": logs}

@router.get("/history/recent")
def get_scan_history(limit: int = 10):
    """Get the most recent scans."""
    return database.get_recent_scans(limit)
