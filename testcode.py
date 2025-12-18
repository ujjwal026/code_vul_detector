import os
import sys
import sqlite3
import pickle
import subprocess
from flask import Flask, request

app = Flask(__name__)

# -------------------------------
# 1. Hardcoded Credentials (CWE-798)
# -------------------------------
DB_USER = "admin"
DB_PASSWORD = "admin123"

# -------------------------------
# 2. SQL Injection (CWE-89)
# -------------------------------
def get_user(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)   # Vulnerable to SQL injection

    result = cursor.fetchall()
    conn.close()
    return result

# -------------------------------
# 3. Command Injection (CWE-78)
# -------------------------------
def list_files(user_input):
    os.system("ls " + user_input)   # Dangerous command execution

# -------------------------------
# 4. Arbitrary Code Execution via eval (CWE-95)
# -------------------------------
def calculate(expr):
    return eval(expr)   # User-controlled input

# -------------------------------
# 5. Insecure Deserialization (CWE-502)
# -------------------------------
def load_data(data):
    return pickle.loads(data)   # Unsafe deserialization

# -------------------------------
# 6. Path Traversal (CWE-22)
# -------------------------------
def read_file(filename):
    with open("/tmp/" + filename, "r") as f:
        return f.read()

# -------------------------------
# 7. Use of assert for security check (CWE-617)
# -------------------------------
def check_admin(is_admin):
    assert is_admin == True   # Can be bypassed with -O flag

# -------------------------------
# 8. Missing Exception Handling
# -------------------------------
def divide(a, b):
    return a / b   # ZeroDivisionError possible

# -------------------------------
# 9. Debug Mode Enabled in Production (CWE-489)
# -------------------------------
@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if username == "admin" and password == "admin123":
        return "Logged in"
    return "Invalid credentials"

# -------------------------------
# 10. Unsafe subprocess usage (CWE-78)
# -------------------------------
def run_command(cmd):
    subprocess.call(cmd, shell=True)   # shell=True is dangerous

# -------------------------------
# 11. Global mutable state
# -------------------------------
USERS = []

def add_user(user):
    USERS.append(user)

# -------------------------------
# 12. Insecure temp file usage
# -------------------------------
def write_temp(data):
    f = open("/tmp/tempfile.txt", "w")
    f.write(data)
    f.close()

# -------------------------------
# Entry point
# -------------------------------
if __name__ == "__main__":
    user_input = input("Enter username: ")
    print(get_user(user_input))

    cmd = input("Enter command: ")
    list_files(cmd)

    expr = input("Enter expression: ")
    print(calculate(expr))

    app.run(debug=True)   # Debug mode ON
