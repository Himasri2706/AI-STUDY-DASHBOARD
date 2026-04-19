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

@admin_bp.route('/upload-pdf', methods=['POST'])
@admin_required
def upload_pdf(current_user):
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    
    file = request.files['file']
    subject = request.form.get('subject')

    if not subject:
        return jsonify({'message': 'Subject is required'}), 400

    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        upload_path = os.path.join(os.path.dirname(__file__), "uploads", filename)
        file.save(upload_path)
        
        try:
            # Process with RAG
            add_pdf_to_vector_db(upload_path, subject)
            
            # Store metadata in DB
            db = get_db()
            cursor = db.cursor()
            cursor.execute("INSERT INTO documents (filename, subject, upload_date, uploaded_by) VALUES (?, ?, ?, ?)", 
                           (filename, subject, str(datetime.datetime.utcnow()), current_user['username']))
            cursor.execute("INSERT OR IGNORE INTO subjects (name) VALUES (?)", (subject,))
            db.commit()
                
            return jsonify({'message': 'File uploaded and processed successfully'}), 200
        except Exception as e:
            return jsonify({'message': f'Error processing file: {str(e)}'}), 500
    
    return jsonify({'message': 'Invalid file type, only PDF allowed'}), 400

@admin_bp.route('/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    db = get_db()
    cursor = db.cursor()
    subjects = cursor.execute("SELECT name FROM subjects").fetchall()
    return jsonify({'subjects': [s['name'] for s in subjects]}), 200

@admin_bp.route('/documents', methods=['GET'])
@admin_required
def get_documents(current_user):
    db = get_db()
    cursor = db.cursor()
    docs = cursor.execute("SELECT * FROM documents").fetchall()
    return jsonify({'documents': [dict(d) for d in docs]}), 200

@admin_bp.route('/delete-pdf', methods=['POST'])
@admin_required
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
