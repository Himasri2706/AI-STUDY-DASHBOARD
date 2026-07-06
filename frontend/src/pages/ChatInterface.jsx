import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, User, Bot, Loader2, GraduationCap, Sparkles, BookOpen, BrainCircuit, ToggleLeft, ToggleRight, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api';
import FlashcardModal from '../components/FlashcardModal';

export default function ChatInterface() {
    const { subject } = useParams();
    const [searchParams] = useSearchParams();
    const branch = searchParams.get('branch');
    const year = searchParams.get('year');
    
    const decodedSubject = decodeURIComponent(subject);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [marks, setMarks] = useState('5');
    const [loading, setLoading] = useState(false);
    
    // New Feature States
    const [personality, setPersonality] = useState('direct');
    const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
    const [activeDocument, setActiveDocument] = useState(null);
    const [showFlashcards, setShowFlashcards] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, activeDocument]);

    const sendQuestion = async (userMsg, weight = marks) => {
        if (!userMsg.trim() || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post('/api/chat', {
                subject: decodedSubject,
                question: userMsg,
                marks: parseInt(weight),
                branch: branch,
                year: year,
                allowGeneralKnowledge: allowGeneralKnowledge,
                personality: personality
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: res.data.answer,
                sources: res.data.sources 
            }]);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Sorry, I encountered an error communicating with the backend brain.';
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: errorMessage,
                sources: [] 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        const msg = input;
        setInput('');
        sendQuestion(msg);
    };

    const handleSourceClick = (srcString) => {
        // e.g. "math_notes.pdf (Page 3)" or "Database Systems (Page 10)"
        const match = srcString.match(/(.+?) \(Page (\d+|Unknown)\)/);
        if (match) {
            const filename = match[1].trim();
            const page = match[2] === 'Unknown' ? 1 : parseInt(match[2]);
            // If the filename doesn't end with .pdf, it's likely an old mock source. 
            // We append .pdf just in case, but actual new documents will have .pdf
            const parsedFilename = filename.toLowerCase().endsWith('.pdf') ? filename : filename + '.pdf';
            setActiveDocument({ filename: parsedFilename, page });
        }
    };

    const suggestedPrompts = [
        { icon: <BookOpen className="w-4 h-4 text-accent" />, text: "Summarize the key concepts" },
        { icon: <BrainCircuit className="w-4 h-4 text-purple-400" />, text: "Generate a practice quiz" },
        { icon: <Sparkles className="w-4 h-4 text-emerald-400" />, text: "Explain the most difficult topic" }
    ];

    return (
        <div className="h-screen flex flex-col relative overflow-hidden font-sans bg-prime w-full pt-[75px]">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px] pointer-events-none z-0"></div>
            <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none z-0"></div>

            {/* Header (Forced to Fixed Top Position) */}
            <header className="fixed top-0 left-0 right-0 h-[75px] bg-sec/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2 text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium hidden sm:inline">Back</span>
                    </Link>
                    <button 
                        onClick={() => setShowFlashcards(true)}
                        className="flex items-center gap-2 text-white bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    >
                        <span className="text-lg">⚡</span>
                        <span className="font-medium hidden sm:inline">Flashcards</span>
                    </button>
                </div>
                
                {/* Title */}
                <div className="flex flex-col items-center justify-center pointer-events-none flex-1 px-4">
                    <h1 className="text-base sm:text-lg font-bold text-gray-100 tracking-tight truncate max-w-[200px] sm:max-w-md">{decodedSubject}</h1>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${allowGeneralKnowledge ? 'text-emerald-400' : 'text-accent'}`}>
                        {allowGeneralKnowledge ? 'General AI Enabled' : 'Strict Mode Enforced'}
                    </p>
                </div>
                
                {/* AI Toggle */}
                <button 
                    onClick={() => setAllowGeneralKnowledge(!allowGeneralKnowledge)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shadow-lg z-50 whitespace-nowrap ${
                        allowGeneralKnowledge 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                        : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }`}
                >
                    {allowGeneralKnowledge ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    <span className="text-sm font-bold hidden sm:inline">{allowGeneralKnowledge ? 'General AI' : 'Strict AI'}</span>
                </button>
            </header>

            {/* Main Content Split View */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Chat Column */}
                <div className={`flex flex-col flex-1 relative ${activeDocument ? 'hidden lg:flex max-w-2xl border-r border-white/10' : ''}`}>
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10 scroll-smooth">
                        <div className="max-w-4xl mx-auto space-y-8 flex flex-col min-h-full">
                            
                            {/* Empty State / Welcome Screen */}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-10 my-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-b from-sec to-prime flex items-center justify-center border border-white/10 shadow-2xl mb-8 relative">
                                        <Bot className="w-12 h-12 text-accent relative z-10" />
                                        <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full"></div>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">How can I help you with <span className="text-accent">{decodedSubject}</span>?</h2>
                                    <p className="text-gray-400 max-w-lg mb-10 leading-relaxed px-4">
                                        I am an AI study companion. I will only provide answers using the specific curriculum documents uploaded for your branch and year.
                                    </p>
                                    
                                    <div className={`grid grid-cols-1 ${activeDocument ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-4 w-full max-w-3xl px-4`}>
                                        {suggestedPrompts.map((prompt, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => sendQuestion(prompt.text, '5')}
                                                className="flex flex-col items-center gap-3 p-4 sm:p-6 glass rounded-2xl border border-white/5 hover:border-accent/50 hover:bg-white/5 transition-all group text-left shadow-lg hover:shadow-accent/10"
                                            >
                                                <div className="p-3 rounded-full bg-prime border border-white/5 group-hover:scale-110 transition-transform">
                                                    {prompt.icon}
                                                </div>
                                                <span className="text-xs sm:text-sm text-gray-300 font-medium text-center">{prompt.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-sec to-prime flex items-center justify-center shrink-0 border border-white/10 shadow-lg mt-1">
                                            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                        </div>
                                    )}
                                    
                                    <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
                                        msg.role === 'user' 
                                        ? 'bg-accent text-white rounded-tr-sm shadow-[0_10px_40px_rgba(59,130,246,0.2)]' 
                                        : 'bg-sec border border-white/5 rounded-tl-sm shadow-xl text-gray-200'
                                    }`}>
                                        <div className={`leading-relaxed markdown-content space-y-4 ${msg.role === 'user' ? 'text-[14px] sm:text-[15px]' : 'text-sm sm:text-base'}`}>
                                            {msg.role === 'assistant' ? (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                            )}
                                        </div>
                                        
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-6 pt-5 border-t border-white/10">
                                                <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3" /> Click Source to View Document
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.sources.map((src, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            onClick={() => handleSourceClick(src)}
                                                            className="flex items-center gap-2 bg-prime border border-white/10 hover:border-accent hover:bg-accent/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs text-gray-400 cursor-pointer transition-colors"
                                                            title="View Document Page"
                                                        >
                                                            <FileTextIcon />
                                                            <span className="truncate max-w-[150px] sm:max-w-[200px]">{src}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-prime border border-white/10 flex items-center justify-center shrink-0 mt-1 shadow-lg overflow-hidden">
                                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {loading && (
                                <div className="flex gap-3 sm:gap-4 animate-in fade-in duration-300">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-sec to-prime flex items-center justify-center shrink-0 border border-white/10 shadow-lg mt-1 relative">
                                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                                        <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
                                    </div>
                                    <div className="bg-sec border border-white/5 rounded-2xl sm:rounded-3xl rounded-tl-sm p-4 sm:p-6 flex items-center gap-3 w-24 sm:w-32 shadow-xl">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-accent/80 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-accent/80 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-accent/80 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-2" />
                        </div>
                    </main>

                    {/* Standard Footer Input Area (Not Absolute/Floating to prevent scroll bugs) */}
                    <footer className="p-3 sm:p-4 md:p-6 bg-sec/90 backdrop-blur-xl border-t border-white/10 z-20 shrink-0">
                        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex flex-col gap-2">
                            
                            <div className="flex items-center gap-2 sm:gap-3 w-full bg-prime border border-white/10 p-1.5 sm:p-2 rounded-2xl shadow-inner">
                                {/* Teacher Mode Marks Selector */}
                                <div className="relative group shrink-0 hidden sm:block">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-hover:text-accent transition-colors">
                                        <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <select 
                                        value={marks} 
                                        onChange={(e) => setMarks(e.target.value)}
                                        className="appearance-none bg-transparent hover:bg-white/5 rounded-xl py-3 pl-9 pr-8 text-sm font-medium text-gray-300 focus:outline-none transition-all cursor-pointer"
                                        title="Exam Weight"
                                    >
                                        <option value="2" className="bg-sec">2 Marks</option>
                                        <option value="5" className="bg-sec">5 Marks</option>
                                        <option value="10" className="bg-sec">10 Marks</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                
                                <div className="relative group shrink-0 hidden md:block">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-hover:text-purple-400 transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <select 
                                        value={personality}
                                        onChange={(e) => setPersonality(e.target.value)}
                                        className="appearance-none bg-transparent hover:bg-white/5 rounded-xl py-3 pl-9 pr-8 text-sm font-medium text-gray-300 focus:outline-none transition-all cursor-pointer w-[160px]"
                                        title="Tutor Personality"
                                    >
                                        <option value="direct" className="bg-sec">Direct Tutor</option>
                                        <option value="socratic" className="bg-sec">Socratic Tutor</option>
                                        <option value="eli5" className="bg-sec">Explain Like I'm 5</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-600">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-white/10 hidden sm:block"></div>

                                <div className="relative flex-1 w-full flex items-center">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Message the AI companion..."
                                        className="w-full bg-transparent py-3 px-3 sm:px-4 text-sm sm:text-base text-white focus:outline-none placeholder-gray-500"
                                        disabled={loading}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="p-2 sm:p-3 flex items-center justify-center bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-accent rounded-xl text-white transition-all shadow-md shrink-0"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />}
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-center text-[10px] sm:text-[11px] text-gray-500/80 font-medium">
                                AI can make mistakes. Verify answers with provided source documents.
                            </p>
                        </form>
                    </footer>
                </div>

                {/* PDF Viewer Column */}
                {activeDocument && (
                    <div className="flex-1 flex flex-col bg-[#323639] relative animate-in slide-in-from-right duration-300">
                        <div className="p-3 bg-[#1e1e1e] flex items-center justify-between border-b border-black z-10 shrink-0 shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-accent/20 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-100">{activeDocument.filename}</h3>
                                    <p className="text-[10px] text-gray-400">Jumping to Page {activeDocument.page}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setActiveDocument(null)} 
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors lg:hidden bg-white/5"
                                    title="Close Document"
                                >
                                    <span className="text-xs mr-2 font-medium">Return to Chat</span>
                                    <X className="w-4 h-4 inline" />
                                </button>
                                <button 
                                    onClick={() => setActiveDocument(null)} 
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors hidden lg:block"
                                    title="Close Document"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Interactive PDF frame. Uses browser built-in PDF viewer with fragment #page=N */}
                        <iframe 
                            src={`http://localhost:5000/uploads/${activeDocument.filename}#page=${activeDocument.page}&view=FitH`}
                            className="flex-1 w-full border-none"
                            title="Interactive Document Viewer"
                        />
                    </div>
                )}
            </div>

            {/* Flashcard Modal */}
            <FlashcardModal 
                isOpen={showFlashcards} 
                onClose={() => setShowFlashcards(false)} 
                subject={subject} 
                branch={branch} 
                year={year} 
            />
        </div>
    );
}

// Helper icon component for sources
const FileTextIcon = () => (
    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);
