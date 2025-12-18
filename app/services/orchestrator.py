import asyncio
import os
from app.services.scanners import sast, sca, secrets, config
from app.services.fixer import FixerService
from app.services.logger import log_scan_event

fixer = FixerService()

async def run_scans(target_path: str, scan_id: str = None):
    """Runs all scanners in parallel and generates AI fixes for vulnerabilities."""
    if scan_id:
        await log_scan_event(scan_id, "🔍 Initializing scanners (SAST, SCA, Secrets, Config)", "info")
    
    results = await asyncio.gather(
        sast.scan(target_path, scan_id),
        sca.scan(target_path, scan_id),
        secrets.scan(target_path, scan_id),
        config.scan(target_path, scan_id),
        return_exceptions=True
    )
    
    if scan_id:
        await log_scan_event(scan_id, "🔗 Merging scanner results", "info")
    
    final_results = []
    
    # Create a list of tasks for fix generation to run them in parallel
    fix_tasks = []

    for result in results:
        if isinstance(result, Exception):
            final_results.append({"tool": "Unknown", "error": str(result), "severity": "ERROR"})
        elif isinstance(result, dict) and "results" in result:
            tool_results = result.get("results", [])
            for item in tool_results:
                if "tool" not in item:
                    item["tool"] = result.get("tool", "Unknown")
                
                # Store the original result object for reference
                final_results.append(item)

                # --- AI FIX GENERATION PREPARATION ---
                if "file" in item and "message" in item:
                    # Construct absolute path
                    # item["file"] is usually relative to the scan root (e.g., "app/main.py")
                    # target_path is the absolute path to the scan root
                    file_path = os.path.join(target_path, item["file"])
                    
                    # Verify file exists
                    if os.path.exists(file_path) and os.path.isfile(file_path):
                        # Schedule the fix generation
                        fix_tasks.append(generate_fix_for_item(item, file_path, fixer, scan_id))
                    else:
                        print(f"⚠️ File not found for fix generation: {file_path}")
                        item["fixed_code"] = "Error: Source file not found."

    # Run all fix tasks in parallel, but limit concurrency
    if fix_tasks:
        if scan_id:
            await log_scan_event(scan_id, f"🤖 Generating AI fixes for {len(fix_tasks)} findings...", "info")
        # Limit to 5 concurrent LLM calls to prevent rate limiting/timeouts
        semaphore = asyncio.Semaphore(5)
        
        async def sem_task(task_func):
            async with semaphore:
                return await task_func
        
        # Wrap tasks with semaphore
        wrapped_tasks = [sem_task(t) for t in fix_tasks]
        await asyncio.gather(*wrapped_tasks)
        if scan_id:
            await log_scan_event(scan_id, "✅ AI fix generation complete", "success")
    
    return final_results

async def generate_fix_for_item(item, file_path, fixer_service, scan_id: str = None):
    """Helper function to generate a fix for a single item and update it in-place."""
    try:
        # Read file content
        content = await asyncio.to_thread(read_file_safe, file_path)
        
        if not content:
            item["fixed_code"] = "Error: Could not read file content."
            item["original_code"] = ""
            return

        line_num = item.get("line")
        
        # Generate fix with timeout
        # Use asyncio.wait_for to enforce a timeout on the LLM call
        try:
            if scan_id:
                await log_scan_event(scan_id, f"🔧 Generating fix for {item.get('file', 'unknown')}", "info")
            
            fix_result = await asyncio.wait_for(
                asyncio.to_thread(fixer_service.fix_code, content, item["message"], line_num),
                timeout=15.0 # 15 seconds per fix max
            )
            
            if isinstance(fix_result, dict):
                item["original_code"] = fix_result.get("original_code", content)
                item["fixed_code"] = fix_result.get("fixed_code", "AI could not generate a fix.")
            else:
                # Fallback for older format
                item["original_code"] = content
                item["fixed_code"] = fix_result if fix_result else "AI could not generate a fix."
        except asyncio.TimeoutError:
            print(f"⚠️ Fix generation timed out for {item.get('file')}")
            item["original_code"] = content
            item["fixed_code"] = "Error: Fix generation timed out."
            
    except Exception as e:
        print(f"❌ Async fix generation failed: {e}")
        item["original_code"] = ""
        item["fixed_code"] = f"Error generating fix: {e}"

def read_file_safe(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None
