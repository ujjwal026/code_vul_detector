"""
Real-time logging service for scan operations.
Maintains a thread-safe queue of logs that can be streamed to clients.
"""
import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Callable

class ScanLogger:
    """Manages real-time logs for ongoing scans."""
    
    def __init__(self):
        self.logs: Dict[str, List[dict]] = defaultdict(list)
        self.subscribers: Dict[str, List[Callable]] = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def log(self, scan_id: str, message: str, level: str = "info", details: dict = None):
        """
        Log a message for a specific scan.
        
        Args:
            scan_id: Unique scan identifier
            message: Log message
            level: Log level (info, warning, error, success)
            details: Additional context as dict
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "level": level,
            "details": details or {}
        }
        
        async with self.lock:
            self.logs[scan_id].append(log_entry)
            
            # Notify all subscribers for this scan
            for callback in self.subscribers[scan_id]:
                try:
                    await callback(log_entry)
                except Exception as e:
                    print(f"Error in log subscriber: {e}")
    
    async def subscribe(self, scan_id: str, callback: Callable):
        """Subscribe to logs for a specific scan."""
        async with self.lock:
            self.subscribers[scan_id].append(callback)
    
    async def unsubscribe(self, scan_id: str, callback: Callable):
        """Unsubscribe from logs for a specific scan."""
        async with self.lock:
            if scan_id in self.subscribers:
                self.subscribers[scan_id].remove(callback)
    
    async def get_logs(self, scan_id: str) -> List[dict]:
        """Get all logs for a scan."""
        async with self.lock:
            return self.logs.get(scan_id, []).copy()
    
    async def clear_logs(self, scan_id: str):
        """Clear logs for a scan."""
        async with self.lock:
            if scan_id in self.logs:
                del self.logs[scan_id]
            if scan_id in self.subscribers:
                del self.subscribers[scan_id]

# Global instance
logger_service = ScanLogger()

async def log_scan_event(scan_id: str, message: str, level: str = "info", details: dict = None):
    """Helper function to log scan events."""
    await logger_service.log(scan_id, message, level, details)
