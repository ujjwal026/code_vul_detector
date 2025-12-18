import sqlite3

# Vulnerable: SQL Injection with f-string
def get_user_vulnerable(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchall()

# Vulnerable: SQL Injection with string concatenation
def get_user_concat(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    return cursor.fetchall()

# Vulnerable: SQL Injection with %-formatting
def get_user_format(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '%s'" % username
    cursor.execute(query)
    return cursor.fetchall()

# Safe: Parameterized query
def get_user_safe(username):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))
    return cursor.fetchall()
