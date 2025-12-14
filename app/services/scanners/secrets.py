import asyncio
import subprocess
import json
import logging
import shutil

logger = logging.getLogger(__name__)

def run_gitleaks_sync(path: str):
    """Synchronous gitleaks execution for Windows compatibility."""
    try:
        result = subprocess.run(
            ["gitleaks", "detect", "--source", path, "--no-git", "--report-format", "json", "--report-path", "-"],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Gitleaks timed out after 60 seconds", -1
    except FileNotFoundError:
        return "", "Gitleaks not found", -1
    except Exception as e:
        return "", str(e), -1

def run_detect_secrets_sync(path: str):
    """Synchronous detect-secrets execution for Windows compatibility."""
    try:
        result = subprocess.run(
            ["detect-secrets", "scan", path],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Detect-secrets timed out after 60 seconds", -1
    except FileNotFoundError:
        return "", "Detect-secrets not found. Please install: pip install detect-secrets", -1
    except Exception as e:
        return "", str(e), -1

async def scan(path: str):
    """Real Secrets scanner using Gitleaks (preferred) or Detect-Secrets."""
    
    # Check if gitleaks is available
    gitleaks_path = shutil.which("gitleaks")
    
    if gitleaks_path:
        return await scan_gitleaks(path)
    else:
        return await scan_detect_secrets(path)

async def scan_gitleaks(path: str):
    try:
        # Run gitleaks in thread pool
        stdout, stderr, returncode = await asyncio.to_thread(run_gitleaks_sync, path)
        
        # Gitleaks returns 1 if secrets found
        if returncode not in [0, 1] and stderr:
             logger.error(f"Gitleaks failed: {stderr}")
             return {"tool": "Secrets", "error": stderr[:200], "results": []}

        if not stdout or stdout.strip() == "":
            return {"tool": "Secrets", "results": []}

        try:
            results_data = json.loads(stdout)
        except json.JSONDecodeError:
            return {"tool": "Secrets", "results": []}

        formatted_results = []
        if isinstance(results_data, list):
            for secret in results_data:
                formatted_results.append({
                    "tool": "Secrets",
                    "vuln": secret.get("Description", "Secret Found"),
                    "file": secret.get("File"),
                    "line": secret.get("StartLine"),
                    "severity": "CRITICAL"
                })
        
        return {"tool": "Secrets", "results": formatted_results, "count": len(formatted_results)}

    except Exception as e:
        logger.exception("Gitleaks scan failed")
        return {"tool": "Secrets", "error": str(e), "results": []}

async def scan_detect_secrets(path: str):
    try:
        # Run detect-secrets in thread pool
        stdout, stderr, returncode = await asyncio.to_thread(run_detect_secrets_sync, path)
        
        if returncode != 0 and not stdout:
             logger.error(f"Detect-secrets failed: {stderr}")
             return {"tool": "Secrets", "error": stderr[:200], "results": []}

        if not stdout:
            return {"tool": "Secrets", "results": []}

        try:
            output = json.loads(stdout)
        except json.JSONDecodeError:
            return {"tool": "Secrets", "error": "Failed to parse detect-secrets output", "results": []}

        results = []
        for filename, secrets in output.get("results", {}).items():
            for secret in secrets:
                results.append({
                    "tool": "Secrets",
                    "vuln": f"Potential Secret ({secret.get('type')})",
                    "file": filename,
                    "line": secret.get("line_number"),
                    "severity": "HIGH"
                })
                
        return {"tool": "Secrets", "results": results, "count": len(results)}

    except Exception as e:
        logger.exception("Detect-secrets scan failed")
        return {"tool": "Secrets", "error": str(e), "results": []}
