import os
import datetime
import jwt
import random
import smtplib
from email.mime.text import MIMEText
from functools import wraps
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db

auth_bp = Blueprint('auth', __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-default-key-please-change-in-prod")
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
                
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user = data
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
        
    db = get_db()
    cursor = db.cursor()
    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user:
        return jsonify({'message': 'User with this email already exists'}), 400

    otp = str(random.randint(100000, 999999))
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    
    # Store OTP in DB
    cursor.execute("INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, ?)", (email, otp, expires_at))
    db.commit()
    
    print(f"==================================================")
    print(f"MOCK OTP SENT TO {email}: {otp}")
    print(f"==================================================")
    
    # Send actual email if configured
    if GMAIL_ADDRESS and GMAIL_APP_PASSWORD:
        try:
            msg = MIMEText(f"Your AI Study Dashboard verification code is: {otp}")
            msg['Subject'] = 'AI Study Dashboard - Verification Code'
            msg['From'] = GMAIL_ADDRESS
            msg['To'] = email
            
            server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)
            server.quit()
            print("OTP emailed successfully!")
        except Exception as e:
            print(f"Failed to send email: {e}")
            
    return jsonify({'message': 'OTP sent successfully. Check your email (or server console)'}), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')
    otp = data.get('otp')

    if not email or not password or not otp:
        return jsonify({'message': 'Missing data'}), 400

    db = get_db()
    cursor = db.cursor()
    
    # Verify OTP
    otp_record = cursor.execute("SELECT * FROM otp_codes WHERE email = ? ORDER BY id DESC LIMIT 1", (email,)).fetchone()
    if not otp_record or otp_record['otp'] != str(otp):
        return jsonify({'message': 'Invalid OTP'}), 400
        
    if datetime.datetime.strptime(otp_record['expires_at'], "%Y-%m-%d %H:%M:%S.%f") < datetime.datetime.utcnow():
        return jsonify({'message': 'OTP expired'}), 400

    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user:
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = generate_password_hash(password)
    cursor.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", (email, hashed_password, role))
    db.commit()

    return jsonify({'message': 'User created successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    db = get_db()
    cursor = db.cursor()
    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({'token': token, 'role': user['role'], 'email': user['email']}), 200
