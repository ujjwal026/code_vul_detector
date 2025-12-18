# Database Setup: MongoDB + SQLite Redundancy

## Overview
The application now uses **dual-database architecture** for reliability:
- **Primary**: MongoDB Atlas (cloud)
- **Fallback**: SQLite (local file-based)

## Benefits
✅ **Automatic Failover**: If MongoDB fails, data still saves to SQLite  
✅ **Data Redundancy**: Every operation writes to both databases  
✅ **Offline Support**: App works without MongoDB connection  
✅ **No Single Point of Failure**: Works with either database available  

## How It Works

### Dual-Write Logic
All operations (`create_project`, `save_scan`, `save_code_change`, etc.) follow this pattern:

1. **Try MongoDB first** (if connected)
2. **Always write to SQLite** as backup
3. **If MongoDB fails**, app continues with SQLite

### Read Logic (Fallback)
All query operations follow this pattern:

1. **Try to read from MongoDB** (if connected)
2. **If MongoDB unavailable**, read from SQLite
3. **Seamless handoff** - same data, same format

## SQLite Database File

**Location**: `devsecops_platform.db`

**Tables**:
- `projects` - Project metadata
- `scans` - Scan results and findings
- `code_changes` - Code modification records

## Setup

No additional setup required! The app automatically:
1. Initializes SQLite on startup (creates `devsecops_platform.db`)
2. Attempts MongoDB connection
3. Falls back to SQLite if MongoDB unavailable

## Environment Variables

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

- If `MONGO_URI` is set and reachable → Dual-write to both
- If `MONGO_URI` is set but unreachable → Write to SQLite only
- If `MONGO_URI` is not set → SQLite only (fully offline-capable)

## Monitoring

Check console output for database operation status:
- ✅ "Connected to MongoDB Atlas successfully!" → MongoDB ready
- 📦 "Retrieved X from SQLite" → Using SQLite fallback
- ⚠️ Messages indicate which database was used

## Example Scenarios

### Scenario 1: MongoDB Working
```
✅ Connected to MongoDB Atlas successfully!
💾 Saved scan to MongoDB: scan_123
💾 Saved scan to SQLite: scan_123
```

### Scenario 2: MongoDB Unavailable
```
⚠️ MongoDB connection failed: [error details]
📦 Using SQLite as fallback database
💾 Saved scan to SQLite: scan_123
```

### Scenario 3: Reading Data
```
📦 Retrieved scans from SQLite
```

## Recovery

If MongoDB comes back online after going down, new data will automatically write to both databases while old data remains accessible from SQLite until manually synced.
