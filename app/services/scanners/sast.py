import asyncio
import subprocess
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

def count_files_sync(path: str):
    """Helper to count files without blocking the event loop."""
    count = 0
    py_count = 0
    for root, _, files in os.walk(path):
        for f in files:
            if f.endswith(('.py', '.js', '.ts', '.java', '.go', '.rb', '.php', '.c', '.cpp')):
                count += 1
                if f.endswith('.py'):
                    py_count += 1
    return count, py_count


def detect_languages_sync(path: str):
    """Scan files under path and return a set of language hints for Semgrep."""
    langs = set()
    ext_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.java': 'java',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.c': 'c',
        '.cpp': 'cpp'
    }
    for root, _, files in os.walk(path):
        for f in files:
            _, ext = os.path.splitext(f.lower())
            if ext in ext_map:
                langs.add(ext_map[ext])
    return list(langs)


def run_semgrep_sync(path: str, lang: str = None):
    """Run Semgrep with auto-config."""
    try:
        # --config=auto is crucial for a generic demo. It detects the language automatically.
        cmd = [
            "semgrep", "scan",
            "--config=auto",
            "--json",
            "--quiet",
            "--max-target-bytes", "1000000",
            path
        ]
        if lang:
            # If a language hint is provided, prefer it over auto so semgrep
            # can pick language-specific rules without needing the registry.
            # We use p/{lang} to ensure we get a ruleset if auto fails or is too broad
            cmd = ["semgrep", "scan", "--config", f"p/{lang}", "--json", "--quiet", "--max-target-bytes", "1000000", path]
        
        # Use a UTF-8 friendly environment so semgrep can read/write registry
        # configs on Windows without hitting codec errors. Do not force
        # SEMGREP_SEND_METRICS off here because `--config=auto` may require
        # metrics to build the runtime config; we'll retry explicitly if
        # semgrep returns the known metrics error.
        env_base = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env=env_base
        )

        stderr = (result.stderr or "")
        if result.returncode != 0 and "Cannot create auto config when metrics are off" in stderr:
            # Retry explicitly enabling metrics for this run
            retry_env = {**env_base, "SEMGREP_SEND_METRICS": "on"}
            retry = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                env=retry_env
            )
            return retry.stdout, retry.returncode

        return result.stdout, result.returncode
    except FileNotFoundError:
        return None, -1
    except Exception as e:
        logger.error(f"Semgrep Error: {e}")
        return None, -1

async def scan(path: str):
    """
    Orchestrates the SAST scanning process.
    """
    if not os.path.exists(path):
        return {"tool": "SAST", "error": "Path not found", "results": []}

    path = os.path.abspath(path) # Ensure absolute path
    
    # 1. Count files (Non-blocking)
    file_count, python_files = await asyncio.to_thread(count_files_sync, path)
    logger.info(f"SAST: Scanning {file_count} files ({python_files} Python) in {path}")

    results = []
    tools_used = []

    # 2. Run Semgrep (Primary Engine)
    # We run this in a thread so the FastAPI loop stays free
    semgrep_output, semgrep_code = await asyncio.to_thread(run_semgrep_sync, path)

    def _parse_semgrep_output(raw):
        parsed = []
        try:
            data = json.loads(raw)
            for res in data.get("results", []):
                parsed.append({
                    "tool": "Semgrep",
                    "vuln": res.get("check_id"),
                    "severity": res.get("extra", {}).get("severity", "MEDIUM"),
                    "file": os.path.relpath(res.get("path", ""), path),
                    "line": res.get("start", {}).get("line"),
                    "message": res.get("extra", {}).get("message", "").strip()[:200],
                    "cwe": res.get("extra", {}).get("metadata", {}).get("cwe", ["Unknown"])[0]
                })
        except Exception:
            logger.debug("Semgrep output parse failed")
        return parsed

    semgrep_results = _parse_semgrep_output(semgrep_output or "")
    if semgrep_results:
        results.extend(semgrep_results)
        tools_used.append("Semgrep")
    else:
        # Fallback: try per-language runs if auto-config didn't return results
        langs = await asyncio.to_thread(detect_languages_sync, path)
        for lang in langs:
            lang_out, lang_code = await asyncio.to_thread(run_semgrep_sync, path, lang)
            parsed = _parse_semgrep_output(lang_out or "")
            if parsed:
                results.extend(parsed)
                tools_used.append(f"Semgrep({lang})")
                break

    # Bandit removed: this scanner now relies only on Semgrep for SAST

    # 4. Return Normalized Data
    logger.info(f"SAST Complete. Found {len(results)} issues.")
    
    return {
        "tool": "SAST",
        "timestamp": "now", # You can use datetime.now().isoformat()
        "scanned_files": file_count,
        "results": results, # The frontend needs this list
        "tools_run": tools_used
    }