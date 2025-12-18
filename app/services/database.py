
import os
import json
import sqlite3
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import uuid

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "devsecops_platform"
COLLECTION_SCANS = "scans"
COLLECTION_PROJECTS = "projects"
SQLITE_DB_PATH = "devsecops_platform.db"

# MongoDB connections
client = None
db = None
scans_collection = None
projects_collection = None
mongo_connected = False

# SQLite connection
sqlite_conn = None
sqlite_cursor = None

def init_sqlite():
    """Initialize SQLite database with required tables."""
    global sqlite_conn, sqlite_cursor
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Create projects table
        sqlite_cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        
        # Create scans table
        sqlite_cursor.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                scan_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                scan_type TEXT NOT NULL,
                target TEXT,
                repo_name TEXT,
                results TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
            )
        ''')
        
        # Create code_changes table
        sqlite_cursor.execute('''
            CREATE TABLE IF NOT EXISTS code_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                original_code TEXT,
                fixed_code TEXT,
                timestamp TEXT NOT NULL
            )
        ''')
        
        sqlite_conn.commit()
        print("✅ SQLite database initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize SQLite: {e}")
        return False

def init_db():
    """Initialize both MongoDB and SQLite connections."""
    global client, db, scans_collection, projects_collection, mongo_connected
    
    # Initialize SQLite first (always available)
    init_sqlite()
    
    # Try to connect to MongoDB
    if MONGO_URI:
        try:
            client = MongoClient(MONGO_URI)
            db = client[DB_NAME]
            scans_collection = db[COLLECTION_SCANS]
            projects_collection = db[COLLECTION_PROJECTS]
            # Test connection
            client.admin.command('ping')
            print("✅ Connected to MongoDB Atlas successfully!")
            mongo_connected = True
        except Exception as e:
            print(f"⚠️ MongoDB connection failed: {e}")
            print("📦 Using SQLite as fallback database")
            client = None
            mongo_connected = False
    else:
        print("⚠️ MONGO_URI not set. Using SQLite only.")
        mongo_connected = False

# --- Project Operations ---

def create_project(name: str, description: str = ""):
    """Create a project in both MongoDB and SQLite."""
    project_id = str(uuid.uuid4())
    project = {
        "project_id": project_id,
        "name": name,
        "description": description,
        "created_at": datetime.now().isoformat()
    }
    
    # Try MongoDB first
    if mongo_connected and projects_collection is not None:
        try:
            projects_collection.insert_one(project)
            print(f"💾 Project saved to MongoDB: {project_id}")
        except Exception as e:
            print(f"⚠️ Error saving to MongoDB: {e}")
    
    # Always save to SQLite as backup
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'INSERT INTO projects (project_id, name, description, created_at) VALUES (?, ?, ?, ?)',
                (project_id, name, description, project["created_at"])
            )
            sqlite_conn.commit()
            print(f"💾 Project saved to SQLite: {project_id}")
        except Exception as e:
            print(f"⚠️ Error saving to SQLite: {e}")
    
    return project

def get_projects():
    """Get projects from MongoDB or SQLite fallback."""
    projects = []
    
    # Try MongoDB first
    if mongo_connected and projects_collection is not None:
        try:
            cursor = projects_collection.find().sort("created_at", -1)
            for doc in cursor:
                doc.pop("_id", None)
                projects.append(doc)
            return projects
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute('SELECT project_id, name, description, created_at FROM projects ORDER BY created_at DESC')
            for row in sqlite_cursor.fetchall():
                projects.append({
                    "project_id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "created_at": row[3]
                })
            if projects:
                print("📦 Retrieved projects from SQLite")
            return projects
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return []

def get_project(project_id: str):
    """Get a specific project from MongoDB or SQLite fallback."""
    # Try MongoDB first
    if mongo_connected and projects_collection is not None:
        try:
            doc = projects_collection.find_one({"project_id": project_id})
            if doc:
                doc.pop("_id", None)
                return doc
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'SELECT project_id, name, description, created_at FROM projects WHERE project_id = ?',
                (project_id,)
            )
            row = sqlite_cursor.fetchone()
            if row:
                print("📦 Retrieved project from SQLite")
                return {
                    "project_id": row[0],
                    "name": row[1],
                    "description": row[2],
                    "created_at": row[3]
                }
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return None

def delete_project(project_id: str):
    """Delete a project from both MongoDB and SQLite."""
    deleted = False
    
    # Try MongoDB
    if mongo_connected and projects_collection is not None:
        try:
            result = projects_collection.delete_one({"project_id": project_id})
            if result.deleted_count > 0:
                scans_collection.delete_many({"project_id": project_id})
                print(f"🗑️  Project deleted from MongoDB: {project_id}")
                deleted = True
        except Exception as e:
            print(f"⚠️ Error deleting from MongoDB: {e}")
    
    # Always delete from SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute('DELETE FROM scans WHERE project_id = ?', (project_id,))
            sqlite_cursor.execute('DELETE FROM projects WHERE project_id = ?', (project_id,))
            sqlite_conn.commit()
            print(f"🗑️  Project deleted from SQLite: {project_id}")
            deleted = True
        except Exception as e:
            print(f"⚠️ Error deleting from SQLite: {e}")
    
    return deleted

def save_scan(scan_id: str, project_id: str, scan_type: str, target: str, results: list):
    """Save a scan result to both MongoDB and SQLite."""
    # Extract repo name if scan_type is 'repo'
    repo_name = None
    if scan_type == "repo" and target:
        parts = target.rstrip("/").split("/")
        if parts:
            repo_name = parts[-1].replace(".git", "")

    timestamp = datetime.now().isoformat()
    results_json = json.dumps(results)
    
    # Try MongoDB first
    if mongo_connected and scans_collection is not None:
        try:
            document = {
                "scan_id": scan_id,
                "project_id": project_id,
                "timestamp": timestamp,
                "scan_type": scan_type,
                "target": target,
                "repo_name": repo_name,
                "results": results 
            }
            scans_collection.insert_one(document)
            print(f"💾 Saved scan to MongoDB: {scan_id}")
        except Exception as e:
            print(f"⚠️ Error saving to MongoDB: {e}")
    
    # Always save to SQLite as backup
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'INSERT INTO scans (scan_id, project_id, timestamp, scan_type, target, repo_name, results) VALUES (?, ?, ?, ?, ?, ?, ?)',
                (scan_id, project_id, timestamp, scan_type, target, repo_name, results_json)
            )
            sqlite_conn.commit()
            print(f"💾 Saved scan to SQLite: {scan_id}")
        except Exception as e:
            print(f"⚠️ Error saving to SQLite: {e}")

def get_scan(scan_id: str):
    """Get a scan from MongoDB or SQLite fallback."""
    # Try MongoDB first
    if mongo_connected and scans_collection is not None:
        try:
            doc = scans_collection.find_one({"scan_id": scan_id})
            if doc:
                doc.pop("_id", None)
                return doc
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'SELECT scan_id, project_id, timestamp, scan_type, target, repo_name, results FROM scans WHERE scan_id = ?',
                (scan_id,)
            )
            row = sqlite_cursor.fetchone()
            if row:
                print("📦 Retrieved scan from SQLite")
                return {
                    "scan_id": row[0],
                    "project_id": row[1],
                    "timestamp": row[2],
                    "scan_type": row[3],
                    "target": row[4],
                    "repo_name": row[5],
                    "results": json.loads(row[6])
                }
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return None

def get_recent_scans(limit: int = 10):
    """Get recent scans from MongoDB or SQLite fallback."""
    scans = []
    
    # Try MongoDB first
    if mongo_connected and scans_collection is not None:
        try:
            cursor = scans_collection.find().sort("timestamp", -1).limit(limit)
            for doc in cursor:
                doc.pop("_id", None)
                scans.append(doc)
            return scans
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'SELECT scan_id, project_id, timestamp, scan_type, target, repo_name, results FROM scans ORDER BY timestamp DESC LIMIT ?',
                (limit,)
            )
            for row in sqlite_cursor.fetchall():
                scans.append({
                    "scan_id": row[0],
                    "project_id": row[1],
                    "timestamp": row[2],
                    "scan_type": row[3],
                    "target": row[4],
                    "repo_name": row[5],
                    "results": json.loads(row[6])
                })
            if scans:
                print("📦 Retrieved scans from SQLite")
            return scans
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return []

def get_project_scans(project_id: str):
    """Get all scans for a project from MongoDB or SQLite fallback."""
    scans = []
    
    # Try MongoDB first
    if mongo_connected and scans_collection is not None:
        try:
            cursor = scans_collection.find({"project_id": project_id}).sort("timestamp", -1)
            for doc in cursor:
                doc.pop("_id", None)
                scans.append(doc)
            return scans
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'SELECT scan_id, project_id, timestamp, scan_type, target, repo_name, results FROM scans WHERE project_id = ? ORDER BY timestamp DESC',
                (project_id,)
            )
            for row in sqlite_cursor.fetchall():
                scans.append({
                    "scan_id": row[0],
                    "project_id": row[1],
                    "timestamp": row[2],
                    "scan_type": row[3],
                    "target": row[4],
                    "repo_name": row[5],
                    "results": json.loads(row[6])
                })
            if scans:
                print("📦 Retrieved project scans from SQLite")
            return scans
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return []

CODE_CHANGES = "code_changes"

def save_code_change(scan_id: str, project_id: str, file_path: str, original_code: str, fixed_code: str):
    """Store a code change record in both MongoDB and SQLite."""
    timestamp = datetime.now().isoformat()
    
    # Try MongoDB first
    if mongo_connected and db is not None:
        try:
            document = {
                "scan_id": scan_id,
                "project_id": project_id,
                "file_path": file_path,
                "original_code": original_code,
                "fixed_code": fixed_code,
                "timestamp": timestamp
            }
            db[CODE_CHANGES].insert_one(document)
            print(f"💾 Code change saved to MongoDB: {file_path}")
        except Exception as e:
            print(f"⚠️ Error saving to MongoDB: {e}")
    
    # Always save to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'INSERT INTO code_changes (scan_id, project_id, file_path, original_code, fixed_code, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (scan_id, project_id, file_path, original_code, fixed_code, timestamp)
            )
            sqlite_conn.commit()
            print(f"💾 Code change saved to SQLite: {file_path}")
        except Exception as e:
            print(f"⚠️ Error saving to SQLite: {e}")

def get_code_changes(scan_id: str):
    """Get code changes from MongoDB or SQLite fallback."""
    changes = []
    
    # Try MongoDB first
    if mongo_connected and db is not None:
        try:
            cursor = db[CODE_CHANGES].find({"scan_id": scan_id})
            for doc in cursor:
                doc.pop("_id", None)
                changes.append(doc)
            return changes
        except Exception as e:
            print(f"⚠️ Error querying MongoDB: {e}")
    
    # Fallback to SQLite
    if sqlite_cursor is not None:
        try:
            sqlite_cursor.execute(
                'SELECT scan_id, project_id, file_path, original_code, fixed_code, timestamp FROM code_changes WHERE scan_id = ?',
                (scan_id,)
            )
            for row in sqlite_cursor.fetchall():
                changes.append({
                    "scan_id": row[0],
                    "project_id": row[1],
                    "file_path": row[2],
                    "original_code": row[3],
                    "fixed_code": row[4],
                    "timestamp": row[5]
                })
            if changes:
                print("📦 Retrieved code changes from SQLite")
            return changes
        except Exception as e:
            print(f"⚠️ Error querying SQLite: {e}")
    
    return changes

