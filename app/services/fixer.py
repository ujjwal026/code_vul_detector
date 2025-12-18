import os
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class FixerService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = None

        if self.api_key:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )

    def extract_code_context(self, source_code: str, line_number: int = None, context_lines: int = 5) -> str:
        """
        Extracts code context around a specific line number.
        Returns the code snippet with surrounding context.
        """
        if not line_number or line_number <= 0:
            return source_code
        
        lines = source_code.splitlines(keepends=True)
        start_idx = max(0, line_number - context_lines - 1)
        end_idx = min(len(lines), line_number + context_lines)
        
        return "".join(lines[start_idx:end_idx])

    def fix_code(self, source_code: str, vulnerability: str, line_number: int = None) -> dict:
        """
        Sends code to LLM and returns dict with original and fixed code.
        Returns: {"original_code": str, "fixed_code": str}
        Any <think> blocks or non-code content are removed defensively.
        """
        if not self.client:
            return {"original_code": source_code, "fixed_code": "Error: GROQ_API_KEY not found."}

        # --- Extract context ---
        context_code = source_code
        original_context = source_code
        if line_number and line_number > 0:
            lines = source_code.splitlines()
            start_line = max(0, line_number - 11)
            end_line = min(len(lines), line_number + 10)
            context_code = "\n".join(lines[start_line:end_line])
            original_context = context_code  # Store the original context for diff comparison

        try:
            response = self.client.chat.completions.create(
                model="qwen/qwen3-32b",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an automated secure code fixing engine.\n"
                            "YOUR RESPONSE MUST FOLLOW THESE RULES EXACTLY:\n\n"
                            "1. Output ONLY the fixed code - nothing else\n"
                            "2. NEVER include <think>, </think>, or any XML tags\n"
                            "3. NEVER include markdown code fences (```)\n"
                            "4. NEVER include explanations, comments, or reasoning\n"
                            "5. NEVER include any text outside the code itself\n"
                            "6. Return only valid, executable Python code\n"
                            "7. Each line must be real Python code - no comments explaining the fix\n\n"
                            "If you need to explain the fix, put it ONLY in actual Python comments using #"
                        )
                    },
                    {
                        "role": "user",
                        "content": f"Fix the security vulnerability in this code:\n{context_code}"
                    }
                ],
                temperature=0.0,
            )

            content = response.choices[0].message.content.strip()

            # --- AGGRESSIVE SANITIZATION ---
            
            # 1. Remove <think>...</think> blocks (multiline)
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            
            # 2. Remove any XML-like tags
            content = re.sub(r"<[^>]+>", "", content)
            
            # 3. Remove markdown code fences and language specifiers
            content = re.sub(r"^```.*?$", "", content, flags=re.MULTILINE).strip()
            content = re.sub(r"```", "", content).strip()
            
            # 4. Remove common reasoning patterns
            content = re.sub(r"(?i)(here.*?code|fixed code|solution|explanation)[\s\n]*[:-]*\s*", "", content).strip()
            
            # 5. Remove lines that look like explanations (starting with //, #, or common phrases)
            lines = content.split('\n')
            cleaned_lines = []
            for line in lines:
                # Keep lines that are code (not pure explanation)
                if line.strip():
                    # Remove explanation markers but keep Python comments that are part of the code
                    stripped = line.strip()
                    # Skip lines that are obviously explanations (not indented code with # comments)
                    if not any(stripped.startswith(x) for x in ['Note:', 'Here', 'This', 'The', 'You', 'I ', 'It ', 'explanation', 'Explanation']):
                        cleaned_lines.append(line)
                else:
                    cleaned_lines.append(line)
            
            content = '\n'.join(cleaned_lines).strip()
            
            # 6. Final cleanup - remove any remaining leading/trailing whitespace
            content = content.strip()
            
            fixed_result = content or "Error: Empty response from LLM."
            return {
                "original_code": original_context,
                "fixed_code": fixed_result
            }

        except Exception as e:
            return {
                "original_code": original_context,
                "fixed_code": f"Error: {str(e)}"
            }
