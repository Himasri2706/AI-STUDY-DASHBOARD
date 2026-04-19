import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env variables before importing modules that need them
load_dotenv()

from db import init_db
from auth import auth_bp
from admin import admin_bp
from rag import chat_bp

def create_app():
    app = Flask(__name__)
    
    # Configure CORS to allow frontend connections
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Ensure upload directory exists
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    
    # Initialize DB (can be skipped or mocked if not connected)
    init_db()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(chat_bp, url_prefix='/api')

    @app.route('/', methods=['GET'])
    def health_check():
        return jsonify({"status": "running", "service": "AI Study Dashboard API"})

    return app

import os

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
