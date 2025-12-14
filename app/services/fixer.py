import os
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

    def fix_code(self, source_code: str, vulnerability: str, line_number: int = None) -> str:
        """
        Sends relevant code context and vulnerability details to Groq LLM to generate a fix.
        Optimized to reduce token usage by sending only the surrounding lines.
        """
        if not self.client:
            return "Error: GROQ_API_KEY not found."

        # --- OPTIMIZATION: Extract Context ---
        # Instead of sending the whole file, we send the vulnerable line +/- 10 lines
        context_code = source_code
        if line_number and line_number > 0:
            lines = source_code.splitlines()
            total_lines = len(lines)
            start_line = max(0, line_number - 11) # 0-indexed, -10 context
            end_line = min(total_lines, line_number + 10)
            
            # Reconstruct the snippet
            snippet_lines = lines[start_line:end_line]
            context_code = "\n".join(snippet_lines)
            
            # Add a hint about where this snippet comes from
            context_code = f"# ... (lines {start_line+1}-{end_line})\n{context_code}\n# ..."

        prompt = (
            f"Fix the vulnerability in this code snippet.\n"
            f"Vuln: {vulnerability}\n\n"
            f"Code:\n```python\n{context_code}\n```\n\n"
            f"Return ONLY the fixed code snippet."
        )

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a security expert. Output only the fixed code."},
                    {"role": "user", "content": prompt}
                ],
              model="llama-3.1-8b-instant",
                temperature=0.1
            )
            
            # Debug: Print raw response
            # print(f"DEBUG: Raw LLM Response: {response}")

            # Clean up the response
            content = response.choices[0].message.content.strip()
            
            if not content:
                return "Error: LLM returned empty content."
                
            if content.startswith("```python"):
                content = content.replace("```python", "", 1)
            if content.startswith("```"):
                content = content.replace("```", "", 1)
            if content.endswith("```"):
                content = content[:-3]
            
            return content.strip()

        except Exception as e:
            return f"Error: {str(e)}"
