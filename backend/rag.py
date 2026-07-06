import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
import fitz # PyMuPDF
import google.generativeai as genai
from PIL import Image
from langchain.schema import Document
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from flask import Blueprint, request, jsonify
from auth import token_required

chat_bp = Blueprint('chat', __name__)

VECTOR_DB_DIR = os.path.join(os.path.dirname(__file__), "vector_db")

def get_embeddings():
    # 100% Free local embeddings, so you don't pay anything for storing PDFs!
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vectorstore():
    embeddings = get_embeddings()
    if os.path.exists(os.path.join(VECTOR_DB_DIR, "index.faiss")):
        return FAISS.load_local(VECTOR_DB_DIR, embeddings, allow_dangerous_deserialization=True)
    return None

def add_pdf_to_vector_db(pdf_path, subject_name):
    pdf_document = fitz.open(pdf_path)
    documents = []
    
    raw_keys = os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))
    gemini_keys = [k.strip() for k in raw_keys.split(",") if k.strip() and k.strip() != "your_google_gemini_api_key_here"]

    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)
        text = page.get_text().strip()
        
        # If very little text, assume it's scanned/handwritten
        if len(text) < 50:
            if gemini_keys:
                ocr_success = False
                for key in gemini_keys:
                    try:
                        genai.configure(api_key=key)
                        vision_model = genai.GenerativeModel('gemini-1.5-flash')
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2)) # higher res for OCR
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        response = vision_model.generate_content([
                            "Extract all handwritten or printed text from this image exactly as written. Do not add commentary.", 
                            img
                        ])
                        text = response.text
                        ocr_success = True
                        break # Break out of the key loop if successful
                    except Exception as e:
                        error_msg = str(e)
                        if "429" in error_msg or "quota" in error_msg.lower():
                            print(f"Key failed during OCR due to quota limit, trying next key...")
                            continue # Try the next key
                        else:
                            print(f"OCR failed for page {page_num + 1}: {e}")
                            break # Break on non-quota errors
                if not ocr_success:
                    print(f"OCR failed completely for page {page_num + 1} (all keys exhausted or error).")
            else:
                print("No Gemini API keys available for OCR of scanned page.")
                
        if text.strip():
            documents.append(Document(
                page_content=text,
                metadata={
                    "subject": subject_name,
                    "page_number": page_num + 1,
                    "filename": os.path.basename(pdf_path)
                }
            ))

    if not documents:
        raise ValueError("Could not extract any readable text from this PDF. This usually happens if the PDF consists of scanned images instead of real digital text and no API key is provided for OCR!")

        
    embeddings = get_embeddings()
    
    # Save to FAISS
    if os.path.exists(os.path.join(VECTOR_DB_DIR, "index.faiss")):
        vectorstore = FAISS.load_local(VECTOR_DB_DIR, embeddings, allow_dangerous_deserialization=True)
        vectorstore.add_documents(documents)
    else:
        vectorstore = FAISS.from_documents(documents, embeddings)
        os.makedirs(VECTOR_DB_DIR, exist_ok=True)
        
    vectorstore.save_local(VECTOR_DB_DIR)

@chat_bp.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    data = request.get_json()
    subject = data.get('subject')
    question = data.get('question')
    marks = data.get('marks', 5)
    branch = data.get('branch')
    year = data.get('year')
    allow_general = data.get('allowGeneralKnowledge', False)
    personality = data.get('personality', 'direct')

    # Security check: Students can only query their own branch and year
    if current_user.get('role') == 'user':
        branch = current_user.get('branch')
        year = current_user.get('year')

    if not subject or not question or not branch or not year:
        return jsonify({'message': 'Subject, branch, year, and question are required'}), 400

    vectorstore = get_vectorstore()
    if not vectorstore:
        return jsonify({'message': 'No knowledge base initialized yet. Please have admin upload first.'}), 404

    unique_subject_id = f"{branch}_{year}_{subject}"

    # The filter allows FAISS to only retrieve docs matching the specific branch, year, and subject
    # Dynamically adjust format and retrieval depth based on Marks
    if marks == 2:
        k_val = 1 # Only grab the single most relevant paragraph for a short answer
        format_instruction = "Provide a very brief 1-2 sentence answer."
    elif marks == 5:
        k_val = 3 # Standard 3 chunks for a solid bullet-point answer
        format_instruction = "Provide a structured response with 4-5 key bullet points. Use markdown."
    elif marks == 10:
        k_val = 6 # Deep retrieval (6 chunks) for a comprehensive essay
        format_instruction = "Provide a comprehensive, detailed essay-style response with headings, multiple paragraphs, and deep explanations. Use markdown."
    else:
        k_val = 3
        format_instruction = "Provide a structured response with 4-5 key bullet points. Use markdown."

    retriever = vectorstore.as_retriever(
        search_kwargs={"k": k_val, "filter": {"subject": unique_subject_id}}
    )

    # Perform retrieval separately
    docs = retriever.invoke(question)
    if len(docs) == 0 and not allow_general:
        return jsonify({
            'answer': 'Not available in the selected subject material',
            'sources': []
        })

    # Standardize sources to include filename
    sources = list(set([f"{doc.metadata.get('filename', subject)} (Page {doc.metadata.get('page_number', 'Unknown')})" for doc in docs]))

    raw_keys = os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))
    gemini_keys = [k.strip() for k in raw_keys.split(",") if k.strip() and k.strip() != "your_google_gemini_api_key_here"]

    if not gemini_keys:
        # FALLBACK: If user hasn't added an API key yet, simulate an answer!
        combined_context = "\n...".join([d.page_content for d in docs])
        answer = f"**[Free Simulated Version - No API Keys Found]**\n\n*Format requested: {marks} Marks*\n\nHere is the exact information I found directly from the PDF regarding your question:\n\n{combined_context}"
        return jsonify({'answer': answer, 'sources': sources})
    
    personality_instruction = ""
    if personality == "socratic":
        personality_instruction = "TUTOR PERSONALITY: Act as a Socratic Tutor. Instead of just giving the direct answer, you must gently guide the student to the answer by asking leading questions. Do not spoon-feed information."
    elif personality == "eli5":
        personality_instruction = "TUTOR PERSONALITY: Act as a friendly teacher explaining to a 5-year-old. Use extremely simple words, fun analogies, and short sentences. Break down complex topics so a child could understand."
    else:
        personality_instruction = "TUTOR PERSONALITY: Act as a direct, concise AI tutor. Provide clear and straightforward answers."

    if allow_general:
        prompt_template = """You are an advanced, general-knowledge AI assistant. 
{personality_instruction}

You have access to the curriculum context below, but you should primarily answer the user's question using your vast general internet knowledge. 
Feel free to provide external examples, industry context, or information beyond the syllabus to give a complete answer.

Formatting requirements for a {marks}-mark question:
{format_instruction}

Curriculum Context (use as a reference): 
{context}

Question: {question}
Answer:"""
    else:
        prompt_template = """You are a highly strict academic evaluator. 
{personality_instruction}

You MUST ONLY use the provided context to answer the question. 
If the exact answer cannot be found in the context below, you MUST refuse to answer and say exactly: "This information is not covered in your uploaded syllabus documents."
Do NOT use outside knowledge under any circumstances. Keep answers strictly confined to the source text.

Formatting requirements for a {marks}-mark question:
{format_instruction}

Context: {context}

Question: {question}
Answer:"""
    PROMPT = PromptTemplate(
        template=prompt_template, 
        input_variables=["context", "question"],
        partial_variables={
            "marks": str(marks), 
            "format_instruction": format_instruction,
            "personality_instruction": personality_instruction
        }
    )
    
    # Try each key in sequence until one succeeds
    for idx, key in enumerate(gemini_keys):
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0, google_api_key=key)
            chain = RetrievalQA.from_chain_type(
                llm=llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=False,
                chain_type_kwargs={"prompt": PROMPT}
            )

            result = chain.invoke({"query": question})
            return jsonify({'answer': result.get('result', ''), 'sources': sources})
        
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                # If this is the last key we have, we must fallback
                if idx == len(gemini_keys) - 1:
                    fallback_text = "\n\n".join([d.page_content for d in docs])
                    return jsonify({
                        'answer': f"**[All API Keys Quota Exceeded]**\nIt looks like every Google API Key you provided has hit its daily free-tier limit. \n\nAs a fallback, here is the raw information extracted directly from your PDF:\n\n{fallback_text}", 
                        'sources': sources
                    })
                else:
                    print(f"Key {idx + 1} hit quota limit. Switching to Key {idx + 2}...")
                    continue # Try the next key in the loop
            
            return jsonify({'answer': f'Error generating AI response: {error_msg}', 'sources': sources})
            
    # Fallback in case loop terminates unexpectedly
    return jsonify({'answer': 'Unknown error occurred during key rotation.', 'sources': sources})

@chat_bp.route('/flashcards', methods=['POST'])
def generate_flashcards():
    import json
    data = request.get_json()
    subject = data.get('subject')
    branch = data.get('branch')
    year = data.get('year')

    vectorstore = get_vectorstore()
    if not vectorstore:
        return jsonify({'message': 'No knowledge base initialized yet.'}), 404

    unique_subject_id = f"{branch}_{year}_{subject}"

    # Retrieve top 10 chunks to generate flashcards from
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 10, "filter": {"subject": unique_subject_id}}
    )
    docs = retriever.invoke("core concepts definitions important terminology summary")
    
    if len(docs) == 0:
        return jsonify({'message': 'No study materials found to generate flashcards.'}), 404

    raw_keys = os.getenv("GOOGLE_API_KEYS", os.getenv("GOOGLE_API_KEY", ""))
    gemini_keys = [k.strip() for k in raw_keys.split(",") if k.strip() and k.strip() != "your_google_gemini_api_key_here"]

    if not gemini_keys:
        # Offline Fallback - simulate flashcards
        flashcards = [{"q": f"Concept from Pg {d.metadata.get('page_number', '?')}", "a": d.page_content[:150] + "..."} for d in docs[:10]]
        return jsonify({'flashcards': flashcards})

    prompt_template = """You are an expert AI tutor. 
Generate exactly 10 interactive flashcards based on the most important definitions, concepts, and formulas from the provided syllabus context.

You MUST return ONLY a valid JSON array of objects, with no other text, markdown formatting, or code blocks.
Format:
[
  {{"q": "Question text here", "a": "Answer text here"}}
]

Context: {context}

JSON Array:"""
    
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context"])
    
    for idx, key in enumerate(gemini_keys):
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.2, google_api_key=key)
            chain = RetrievalQA.from_chain_type(
                llm=llm, chain_type="stuff", retriever=retriever,
                return_source_documents=False, chain_type_kwargs={"prompt": PROMPT}
            )

            result = chain.invoke({"query": "core concepts definitions important terminology summary"})
            response_text = result.get('result', '').strip()
            
            # Strip markdown blocks
            if response_text.startswith("```json"): response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"): response_text = response_text[3:-3].strip()
                
            try:
                flashcards = json.loads(response_text)
                return jsonify({'flashcards': flashcards})
            except Exception as parse_err:
                return jsonify({'message': 'Failed to parse AI output into flashcards.'}), 500
        
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                if idx == len(gemini_keys) - 1:
                    flashcards = [{"q": f"Concept from Pg {d.metadata.get('page_number', '?')}", "a": d.page_content[:150] + "..."} for d in docs[:10]]
                    return jsonify({'flashcards': flashcards})
                else:
                    continue
            return jsonify({'message': f'Error generating flashcards: {error_msg}'}), 500
            
    return jsonify({'message': 'Unknown error occurred during key rotation.'}), 500
