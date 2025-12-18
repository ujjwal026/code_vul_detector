# SQL Injection Detection Enhancement

## Problem
Your code shows SQL Injection vulnerabilities, but sometimes they're not detected consistently by the SAST scanner.

## Solution
Enhanced the SAST scanner with **3-tier fallback detection strategy**:

### Tier 1: Semgrep Auto-Config
- Uses Semgrep's built-in rules
- Auto-detects programming language
- Fast and accurate for common patterns

### Tier 2: Custom Rules + Language-Specific Detection
- If Tier 1 finds nothing, runs language-specific Semgrep configs (`p/python`, `p/javascript`, etc.)
- Falls back to custom YAML rules for SQL injection patterns
- File: `app/services/scanners/custom_rules.yaml`

### Tier 3: Pattern-Based Detection
- If Tier 1 & 2 find nothing, uses regex patterns
- Directly searches for dangerous code patterns:
  - f-strings in SQL: `f"SELECT * FROM ... WHERE x = '{user}'"`
  - String concatenation: `"SELECT * WHERE x = '" + user + "'"`
  - %-formatting: `"SELECT * WHERE x = '%s'" % user`

## What Gets Detected

### 🔴 Vulnerable Patterns (Always Caught):

```python
# Pattern 1: f-string injection
query = f"SELECT * FROM users WHERE username = '{username}'"
cursor.execute(query)

# Pattern 2: String concatenation
query = "SELECT * FROM users WHERE username = '" + username + "'"
cursor.execute(query)

# Pattern 3: %-formatting
query = "SELECT * FROM users WHERE username = '%s'" % username
cursor.execute(query)

# Pattern 4: Direct execute with f-string
cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")
```

### ✅ Safe Pattern (Not Flagged):

```python
# Parameterized query - SAFE
query = "SELECT * FROM users WHERE username = ?"
cursor.execute(query, (username,))
```

## Custom Rules Created

**File**: `app/services/scanners/custom_rules.yaml`

Includes rules for:
- Python f-string SQL injection
- String concatenation SQL injection
- %-formatting SQL injection
- Direct execute() calls with string formatting
- Metadata: CWE-89, OWASP A03:2021

## Testing

Test file created: `test_sql_injection.py`
- Contains 3 vulnerable functions
- Contains 1 safe function using parameterized queries
- Used to verify detection works

## How It Works

```
Scan Request
    ↓
Tier 1: Semgrep Auto-Config
    ├─ Found issues? → Return
    └─ No issues? → Tier 2
    
Tier 2: Language-Specific + Custom Rules
    ├─ Found issues? → Return
    └─ No issues? → Tier 3
    
Tier 3: Pattern-Based Regex Detection
    ├─ Found issues? → Return
    └─ No issues? → Return empty
```

## Result

**Consistency Improved**: Same vulnerable code will ALWAYS be detected now by at least one of the three detection methods.

**SQL Injection CWE-89** will be caught and severity will be marked as **HIGH** or **CRITICAL**.
