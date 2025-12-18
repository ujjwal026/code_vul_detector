import asyncio
import subprocess
import json
import logging
import os
from app.services.logger import log_scan_event

logger = logging.getLogger(__name__)

def run_safety_sync(req_file: str):
    """Synchronous safety execution for Windows compatibility."""
    try:
        result = subprocess.run(
            ["safety", "check", "--file", req_file, "--json"],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Safety timed out after 30 seconds", -1
    except FileNotFoundError:
        return "", "Safety not found. Please install: pip install safety", -1
    except Exception as e:
        return "", str(e), -1

async def scan(path: str, scan_id: str = None):
    """Real SCA scanner using Safety."""
    try:
        # Check for requirements.txt
        req_file = os.path.join(path, "requirements.txt")
        if not os.path.exists(req_file):
            if scan_id:
                await log_scan_event(scan_id, "📦 SCA: No requirements.txt found, skipping dependency check", "info")
            return {"tool": "SCA", "results": [], "note": "No requirements.txt found"}

        if scan_id:
            await log_scan_event(scan_id, "📦 SCA: Scanning dependencies for vulnerabilities", "info")

        # Run safety in thread pool
        stdout, stderr, returncode = await asyncio.to_thread(run_safety_sync, req_file)
        
        if returncode not in [0, 64] and not stdout:  # Safety returns 64 on vulns
             logger.error(f"Safety failed: {stderr}")
             if scan_id:
                 await log_scan_event(scan_id, f"❌ SCA: Safety error: {stderr[:100]}", "error")
             return {"tool": "SCA", "error": stderr[:200], "results": []}

        if not stdout:
            if scan_id:
                await log_scan_event(scan_id, "✅ SCA: No known vulnerabilities in dependencies", "success")
            return {"tool": "SCA", "results": []}

        try:
            output = json.loads(stdout)
        except json.JSONDecodeError:
             # Fallback if safety output is not pure JSON
             if scan_id:
                 await log_scan_event(scan_id, "❌ SCA: Could not parse Safety output", "error")
             return {"tool": "SCA", "error": "Failed to parse Safety output", "results": []}

        results = []
        # Safety JSON format varies by version
        vulns = output.get("vulnerabilities", []) if isinstance(output, dict) else output
        
        for vuln in vulns:
            if isinstance(vuln, dict):
                 results.append({
                    "tool": "SCA",
                    "vuln": vuln.get("package_name", "Unknown"),
                    "version": vuln.get("vulnerable_spec", "Unknown"),
                    "severity": vuln.get("severity", "MEDIUM"),
                    "advisory": vuln.get("advisory")
                })
        
        if scan_id and results:
            await log_scan_event(scan_id, f"⚠️ SCA: Found {len(results)} vulnerable dependencies", "warning")
            
        return {"tool": "SCA", "results": results, "count": len(results)}

    except Exception as e:
        logger.exception("SCA scan failed")
        if scan_id:
            await log_scan_event(scan_id, f"❌ SCA: Exception: {str(e)[:100]}", "error")
        return {"tool": "SCA", "error": str(e), "results": []}
