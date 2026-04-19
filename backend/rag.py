import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
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
    # Load PDF
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    # Add metadata
    for doc in documents:
        doc.metadata["subject"] = subject_name
        doc.metadata["page_number"] = doc.metadata.get("page", 0) + 1 

    # Split text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
    docs = text_splitter.split_documents(documents)

    if not docs:
        raise ValueError("Could not extract any readable text from this PDF. This usually happens if the PDF consists of scanned images instead of real digital text!")
        
    embeddings = get_embeddings()
    
    # Save to FAISS
    if os.path.exists(os.path.join(VECTOR_DB_DIR, "index.faiss")):
        vectorstore = FAISS.load_local(VECTOR_DB_DIR, embeddings, allow_dangerous_deserialization=True)
        vectorstore.add_documents(docs)
    else:
        vectorstore = FAISS.from_documents(docs, embeddings)
        os.makedirs(VECTOR_DB_DIR, exist_ok=True)
        
    vectorstore.save_local(VECTOR_DB_DIR)

@chat_bp.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    data = request.get_json()
    subject = data.get('subject')
    question = data.get('question')

    if not subject or not question:
        return jsonify({'message': 'Subject and question are required'}), 400

    vectorstore = get_vectorstore()
    if not vectorstore:
        return jsonify({'message': 'No knowledge base initialized yet. Please have admin upload first.'}), 404

    # The filter allows FAISS to only retrieve docs matching the subject
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 3, "filter": {"subject": subject}}
    )

    # Perform retrieval separately
    docs = retriever.invoke(question)
    if len(docs) == 0:
        return jsonify({
            'answer': 'Not available in the selected subject material',
            'sources': []
        })

    # Standardize sources
    sources = list(set([f"{subject} (Page {doc.metadata.get('page_number', 'Unknown')})" for doc in docs]))

    gemini_key = os.getenv("GOOGLE_API_KEY")
    if not gemini_key or gemini_key == "your_google_gemini_api_key_here":
        # FALLBACK: If user hasn't added an API key yet, simulate an answer!
        combined_context = "\n...".join([d.page_content for d in docs])
        answer = f"[Note: You are using the Free Simulated version because no API key is added in backend/.env]\n\nHere is the exact information I found directly from the PDF regarding your question:\n\n\"{combined_context}\""
        return jsonify({'answer': answer, 'sources': sources})

    # Initialize Gemini LLM if key is available
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, google_api_key=gemini_key)
    
    prompt_template = """You are a strict academic assistant. Use the following pieces of retrieved context to answer the question.
If the answer is not contained in the context, you MUST say exactly "Not available in the selected subject material".
Do NOT use external knowledge. Keep answers exam-oriented and clear.

Context: {context}

Question: {question}
Answer:"""
    PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    
    chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=False,
        chain_type_kwargs={"prompt": PROMPT}
    )

    try:
        result = chain.invoke({"query": question})
        return jsonify({'answer': result.get('result', ''), 'sources': sources})
    except Exception as e:
         return jsonify({'answer': f'Error generating AI response: {str(e)}', 'sources': sources})
