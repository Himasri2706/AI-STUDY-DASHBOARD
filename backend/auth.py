import os
import datetime
import jwt
import random
import requests
from functools import wraps
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db

auth_bp = Blueprint('auth', __name__)

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-default-key-please-change-in-prod")


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



@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    branch = data.get('branch')
    year = data.get('year')

    db = get_db()
    cursor = db.cursor()
    user = cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    # Verify role
    if user['role'] != role:
        return jsonify({'message': f'Account is not registered as a {role}.'}), 401

    # Extract institutional fields from DB
    user_branch = user['branch'] if 'branch' in user.keys() else None
    user_year = str(user['year']) if 'year' in user.keys() and user['year'] is not None else None

    # Verify branch and year if provided
    if role in ['user', 'teacher']:
        if user_branch and branch and user_branch != branch:
            return jsonify({'message': f'Account is not registered in branch {branch}.'}), 401
        if user_year and year:
            if role == 'teacher':
                import json
                try:
                    assigned_years = json.loads(user_year)
                    if str(year) not in assigned_years:
                        return jsonify({'message': f'Account is not registered in year {year}.'}), 401
                except Exception:
                    if user_year != str(year):
                        return jsonify({'message': f'Account is not registered in year {year}.'}), 401
            else:
                if user_year != str(year):
                    return jsonify({'message': f'Account is not registered in year {year}.'}), 401

    token = jwt.encode({
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'branch': user_branch,
        'year': user_year,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({'token': token, 'role': user['role'], 'email': user['email'], 'branch': user_branch, 'year': user_year}), 200
