import asyncio
import subprocess
import json
import logging
import os

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

async def scan(path: str):
    """Real SCA scanner using Safety."""
    try:
        # Check for requirements.txt
        req_file = os.path.join(path, "requirements.txt")
        if not os.path.exists(req_file):
            return {"tool": "SCA", "results": [], "note": "No requirements.txt found"}

        # Run safety in thread pool
        stdout, stderr, returncode = await asyncio.to_thread(run_safety_sync, req_file)
        
        if returncode not in [0, 64] and not stdout:  # Safety returns 64 on vulns
             logger.error(f"Safety failed: {stderr}")
             return {"tool": "SCA", "error": stderr[:200], "results": []}

        if not stdout:
            return {"tool": "SCA", "results": []}

        try:
            output = json.loads(stdout)
        except json.JSONDecodeError:
             # Fallback if safety output is not pure JSON
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
            
        return {"tool": "SCA", "results": results, "count": len(results)}

    except Exception as e:
        logger.exception("SCA scan failed")
        return {"tool": "SCA", "error": str(e), "results": []}
