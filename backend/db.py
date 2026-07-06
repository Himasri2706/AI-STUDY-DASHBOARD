import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT UNIQUE,
                        password TEXT,
                        role TEXT,
                        branch TEXT,
                        year INTEGER)''')
                        
    cursor.execute('''CREATE TABLE IF NOT EXISTS subjects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE)''')
                        
    cursor.execute('''CREATE TABLE IF NOT EXISTS documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        filename TEXT,
                        subject TEXT,
                        branch TEXT,
                        year INTEGER,
                        upload_date TEXT,
                        uploaded_by TEXT)''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS otp_codes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT,
                        otp TEXT,
                        expires_at DATETIME)''')

    # Graceful migrations for existing DBs
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN branch TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN year INTEGER")
    except:
        pass
        
    try:
        cursor.execute("ALTER TABLE documents ADD COLUMN branch TEXT")
        cursor.execute("ALTER TABLE documents ADD COLUMN year INTEGER")
    except:
        pass
                        
    # Insert default admin and student automatically for the user!
    admin_pass = generate_password_hash("admin123")
    try:
        cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", ("admin@example.com", admin_pass, "admin"))
    except:
        cursor.execute("UPDATE users SET password = ? WHERE email = ?", (admin_pass, "admin@example.com"))
        
    user_pass = generate_password_hash("student123")
    try:
        cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", ("student@example.com", user_pass, "user"))
    except:
        cursor.execute("UPDATE users SET password = ? WHERE email = ?", (user_pass, "student@example.com"))

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
