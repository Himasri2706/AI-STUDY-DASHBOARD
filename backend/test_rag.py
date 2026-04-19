import sys
import os
import traceback

sys.path.append(r'c:\Users\honey\Downloads\ai-study-dashboard\backend')
try:
    from rag import add_pdf_to_vector_db
    print("Dependencies loaded successfully!")
    
    pdf_path = r'c:\Users\honey\Downloads\1000054016.pdf' # Found from earlier list dir
    
    add_pdf_to_vector_db(pdf_path, "TEST_SUBJECT")
    print("SUCCESS: Vector added!")
except Exception as e:
    print(f"FAILED: {e}")
    traceback.print_exc()
