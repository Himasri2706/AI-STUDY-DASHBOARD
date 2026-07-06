import os
import datetime
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from functools import wraps
from auth import token_required
from db import get_db
from rag import add_pdf_to_vector_db

admin_bp = Blueprint('admin', __name__)

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def admin_required(f):
    @token_required
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Admin privilege required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

def teacher_or_admin_required(f):
    @token_required
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') not in ['admin', 'teacher']:
            return jsonify({'message': 'Teacher or Admin privilege required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

@admin_bp.route('/upload-pdf', methods=['POST'])
@teacher_or_admin_required
def upload_pdf(current_user):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    
    file = request.files['file']
    subject = request.form.get('subject')
    branch = request.form.get('branch')
    year = request.form.get('year')

    # Security check: Teachers must upload to their assigned branch and year
    if current_user.get('role') == 'teacher':
        if current_user.get('branch'):
            branch = current_user.get('branch')
            
        teacher_years_str = current_user.get('year')
        if teacher_years_str:
            import json
            try:
                assigned_years = json.loads(teacher_years_str)
                if str(year) not in assigned_years:
                    return jsonify({'message': f'You are not authorized to upload documents for year {year}.'}), 403
            except Exception:
                pass

    if not subject or not branch or not year:
        return jsonify({'message': 'Subject, branch, and year are required'}), 400

    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_path = os.path.join(os.path.dirname(__file__), "uploads", filename)
        
        try:
            os.makedirs(os.path.dirname(upload_path), exist_ok=True)
            file.save(upload_path)
            
            # Process with RAG, we can prepend branch/year to subject to isolate them
            unique_subject_id = f"{branch}_{year}_{subject}"
            add_pdf_to_vector_db(upload_path, unique_subject_id)
            
            # Store metadata in DB
            db = get_db()
            cursor = db.cursor()
            cursor.execute("INSERT INTO documents (filename, subject, branch, year, upload_date, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)", 
                           (filename, subject, branch, int(year), str(datetime.datetime.utcnow()), current_user.get('email', 'admin')))
            db.commit()
                
            return jsonify({'message': 'File uploaded and processed successfully'}), 200
        except Exception as e:
            return jsonify({'message': f'Error processing file: {str(e)}'}), 500
    
    return jsonify({'message': 'Invalid file type, only PDF allowed'}), 400

@admin_bp.route('/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    # Retrieve subjects filtered by branch and year if provided
    branch = request.args.get('branch')
    year = request.args.get('year')

    # Security check: Students can only view their own branch and year
    if current_user.get('role') == 'user':
        branch = current_user.get('branch')
        year = current_user.get('year')

    db = get_db()
    cursor = db.cursor()
    
    if branch and year:
        subjects = cursor.execute("SELECT DISTINCT subject FROM documents WHERE branch = ? AND year = ?", (branch, int(year))).fetchall()
    else:
        subjects = cursor.execute("SELECT DISTINCT subject FROM documents").fetchall()
        
    return jsonify({'subjects': [s['subject'] for s in subjects]}), 200

@admin_bp.route('/documents', methods=['GET'])
@teacher_or_admin_required
def get_documents(current_user):
    db = get_db()
    cursor = db.cursor()
    docs = cursor.execute("SELECT * FROM documents").fetchall()
    return jsonify({'documents': [dict(d) for d in docs]}), 200

@admin_bp.route('/delete-pdf', methods=['POST'])
@teacher_or_admin_required
def delete_pdf(current_user):
    data = request.get_json()
    filename = data.get('filename')
    
    if not filename:
        return jsonify({'message': 'Filename is required'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM documents WHERE filename = ?", (filename,))
    db.commit()
    
    try:
        os.remove(os.path.join(os.path.dirname(__file__), "uploads", filename))
    except:
        pass
        
    return jsonify({'message': 'Document deleted from records.'}), 200

# --- USER PROVISIONING (Admin Only) ---
from werkzeug.security import generate_password_hash

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users(current_user):
    db = get_db()
    cursor = db.cursor()
    users = cursor.execute("SELECT id, email, role, branch, year FROM users").fetchall()
    return jsonify({'users': [dict(u) for u in users]}), 200

@admin_bp.route('/create-user', methods=['POST'])
@admin_required
def create_user(current_user):
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')
    branch = data.get('branch', None)
    year = data.get('year', None)

    if role == 'teacher' and isinstance(year, list):
        import json
        year = json.dumps(year)
    elif role == 'user' and year is not None:
        year = int(year)
    else:
        year = None

    if role not in ['user', 'teacher', 'admin']:
        return jsonify({'message': 'Invalid role'}), 400

    if not email or not password:
        return jsonify({'message': 'Email and password required'}), 400

    db = get_db()
    cursor = db.cursor()
    if cursor.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone():
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = generate_password_hash(password)
    cursor.execute("INSERT INTO users (email, password, role, branch, year) VALUES (?, ?, ?, ?, ?)", 
                   (email, hashed_password, role, branch, year if year else None))
    db.commit()

    return jsonify({'message': 'User provisioned successfully'}), 201

@admin_bp.route('/delete-user', methods=['POST'])
@admin_required
def delete_user(current_user):
    data = request.get_json()
    email = data.get('email')
    if email == current_user.get('email'):
        return jsonify({'message': 'Cannot delete yourself'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    db.commit()
    return jsonify({'message': 'User deleted successfully'}), 200
