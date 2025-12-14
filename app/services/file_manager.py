import os
import tempfile
import shutil
import subprocess
import uuid
from fastapi import UploadFile, HTTPException

def create_temp_dir() -> str:
    """Creates a unique temporary directory."""
    return tempfile.mkdtemp(prefix="scan_")

async def clone_repo(repo_url: str) -> str:
    """Clones a git repository to a temporary directory."""
    temp_dir = create_temp_dir()
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, temp_dir],
            check=True,
            capture_output=True,
            text=True
        )
        return temp_dir
    except subprocess.CalledProcessError as e:
        shutil.rmtree(temp_dir)
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {e.stderr}")

def save_text(content: str, language: str) -> str:
    """Saves raw text content to a file in a temporary directory."""
    temp_dir = create_temp_dir()
    extension_map = {
        "python": "py",
        "javascript": "js",
        "typescript": "ts",
        "java": "java",
        "cpp": "cpp",
        "c": "c",
        "go": "go",
        "php": "php",
        "ruby": "rb"
    }
    extension = extension_map.get(language.lower(), "txt")
    
    filename = f"source.{extension}"
    file_path = os.path.join(temp_dir, filename)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    return temp_dir

async def save_upload(file: UploadFile) -> str:
    """Saves an uploaded file to a temporary directory."""
    temp_dir = create_temp_dir()
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")
    finally:
        file.file.close()
        
    return temp_dir
