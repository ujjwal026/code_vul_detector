import asyncio
import subprocess
import json
import logging

logger = logging.getLogger(__name__)

def run_checkov_sync(path: str):
    """Synchronous checkov execution for Windows compatibility."""
    try:
        result = subprocess.run(
            ["checkov", "-d", path, "-o", "json", "--quiet", "--no-guide"],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Checkov timed out after 60 seconds", -1
    except FileNotFoundError:
        return "", "Checkov not found. Please install: pip install checkov", -1
    except Exception as e:
        return "", str(e), -1

async def scan(path: str):
    """Real Config scanner using Checkov."""
    try:
        # Run checkov in thread pool
        stdout, stderr, returncode = await asyncio.to_thread(run_checkov_sync, path)
        
        # Checkov exit code can be non-zero if issues found. If Checkov
        # is not installed (FileNotFoundError) we return a note so the
        # orchestrator can continue without treating it as a hard error.
        if not stdout and returncode not in [0, 1]:
            # If checkov is missing, return a friendly note instead of an error
            if stderr and "Checkov not found" in stderr:
                return {"tool": "Config", "note": stderr.strip(), "results": []}
            logger.error(f"Checkov failed: {stderr}")
            return {"tool": "Config", "error": stderr[:200], "results": []}

        if not stdout:
            return {"tool": "Config", "results": []}

        try:
            output = json.loads(stdout)
        except json.JSONDecodeError:
            return {"tool": "Config", "error": "Failed to parse Checkov output", "results": []}

        results = []
        
        # Checkov output can be a list or dict
        if isinstance(output, dict):
            output = [output]
            
        for framework_result in output:
            failed_checks = framework_result.get("results", {}).get("failed_checks", [])
            for check in failed_checks:
                results.append({
                    "tool": "Config",
                    "vuln": check.get("check_id"),
                    "description": check.get("check_name"),
                    "file": check.get("file_path"),
                    "lines": check.get("file_line_range"),
                    "severity": "HIGH"
                })
            
        return {"tool": "Config", "results": results, "count": len(results)}

    except Exception as e:
        logger.exception("Config scan failed")
        return {"tool": "Config", "error": str(e), "results": []}
