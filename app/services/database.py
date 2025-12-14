
import os
import json
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import uuid

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "devsecops_platform"
COLLECTION_SCANS = "scans"
COLLECTION_PROJECTS = "projects"

client = None
db = None
scans_collection = None
projects_collection = None

def init_db():
    """Initialize the MongoDB connection."""
    global client, db, scans_collection, projects_collection
    if MONGO_URI:
        try:
            client = MongoClient(MONGO_URI)
            db = client[DB_NAME]
            scans_collection = db[COLLECTION_SCANS]
            projects_collection = db[COLLECTION_PROJECTS]
            # Test connection
            client.admin.command('ping')
            print("✅ Connected to MongoDB Atlas successfully!")
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            client = None

# --- Project Operations ---

def create_project(name: str, description: str = ""):
    if projects_collection is None:
        return None
    
    project_id = str(uuid.uuid4())
    project = {
        "project_id": project_id,
        "name": name,
        "description": description,
        "created_at": datetime.now().isoformat()
    }
    
    try:
        projects_collection.insert_one(project)
        project.pop("_id", None)
        return project
    except Exception as e:
        print(f"❌ Error creating project: {e}")
        return None

def get_projects():
    if projects_collection is None:
        return []
    
    try:
        cursor = projects_collection.find().sort("created_at", -1)
        projects = []
        for doc in cursor:
            doc.pop("_id", None)
            projects.append(doc)
        return projects
    except Exception as e:
        print(f"❌ Error listing projects: {e}")
        return []

def get_project(project_id: str):
    if projects_collection is None:
        return None
    try:
        doc = projects_collection.find_one({"project_id": project_id})
        if doc:
            doc.pop("_id", None)
        return doc
    except Exception as e:
        print(f"❌ Error getting project: {e}")
        return None
def delete_project(project_id: str):
    if projects_collection is None or scans_collection is None:
        return False
    try:
        # Delete the project
        result = projects_collection.delete_one({"project_id": project_id})
        if result.deleted_count > 0:
            # Delete associated scans
            scans_collection.delete_many({"project_id": project_id})
            return True
        return False
    except Exception as e:
        print(f"❌ Error deleting project: {e}")
        return False

def save_scan(scan_id: str, project_id: str, scan_type: str, target: str, results: list):
    """Save a scan result to MongoDB."""
    if scans_collection is None:
        print("⚠️ MongoDB not connected. Skipping save.")
        return

    # Extract repo name if scan_type is 'repo'
    repo_name = None
    if scan_type == "repo" and target:
        parts = target.rstrip("/").split("/")
        if parts:
            repo_name = parts[-1].replace(".git", "")

    document = {
        "scan_id": scan_id,
        "project_id": project_id,
        "timestamp": datetime.now().isoformat(),
        "scan_type": scan_type,
        "target": target,
        "repo_name": repo_name,
        "results": results 
    }
    
    try:
        result = scans_collection.insert_one(document)
        print(f"💾 Saved scan to MongoDB: {scan_id} (Project: {project_id})")
    except Exception as e:
        print(f"❌ Error saving to MongoDB: {e}")

def get_scan(scan_id: str):
    if scans_collection is None:
        return None
    
    try:
        doc = scans_collection.find_one({"scan_id": scan_id})
        if doc:
            doc.pop("_id", None)
        return doc
    except Exception as e:
        print(f"❌ Error retrieving from MongoDB: {e}")
        return None

def get_recent_scans(limit: int = 10):
    if scans_collection is None:
        return []
    
    try:
        cursor = scans_collection.find().sort("timestamp", -1).limit(limit)
        scans = []
        for doc in cursor:
            doc.pop("_id", None)
            # Fetch project name if possible, or just return scan
            scans.append(doc)
        return scans
    except Exception as e:
        print(f"❌ Error retrieving recent scans: {e}")
        return []

def get_project_scans(project_id: str):
    if scans_collection is None:
        return []
    try:
        cursor = scans_collection.find({"project_id": project_id}).sort("timestamp", -1)
        scans = []
        for doc in cursor:
            doc.pop("_id", None)
            scans.append(doc)
        return scans
    except Exception as e:
        print(f"❌ Error getting project scans: {e}")
        return []

CODE_CHANGES = "code_changes"

def save_code_change(scan_id: str, project_id: str, file_path: str, original_code: str, fixed_code: str):
    """Store a code change record linking original and fixed code.
    This can be used to retrieve diffs later.
    """
    if scans_collection is None:
        print("⚠️ MongoDB not connected. Skipping code change save.")
        return
    try:
        document = {
            "scan_id": scan_id,
            "project_id": project_id,
            "file_path": file_path,
            "original_code": original_code,
            "fixed_code": fixed_code,
            "timestamp": datetime.now().isoformat()
        }
        db[CODE_CHANGES].insert_one(document)
        print(f"💾 Saved code change for {file_path} (Scan: {scan_id})")
    except Exception as e:
        print(f"❌ Error saving code change: {e}")

