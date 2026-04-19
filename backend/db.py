import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE,
                        password TEXT,
                        role TEXT)''')
                        
    cursor.execute('''CREATE TABLE IF NOT EXISTS subjects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE)''')
                        
    cursor.execute('''CREATE TABLE IF NOT EXISTS documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        filename TEXT,
                        subject TEXT,
                        upload_date TEXT,
                        uploaded_by TEXT)''')
                        
    # Insert default admin and student automatically for the user!
    try:
        admin_pass = generate_password_hash("admin123")
        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ("AdminMaster", admin_pass, "admin"))
    except:
        pass # Already exists
        
    try:
        user_pass = generate_password_hash("student123")
        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ("StudentPro", user_pass, "user"))
    except:
        pass # Already exists

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
