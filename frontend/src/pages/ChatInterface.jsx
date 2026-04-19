import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, User, Bot, Loader2 } from 'lucide-react';
import api from '../api';

export default function ChatInterface() {
    const { subject } = useParams();
    const [messages, setMessages] = useState([
        { role: 'assistant', text: `Hello! I am your AI study assistant set to answer exactly from the materials related to "${subject}". What would you like to know?`, sources: [] }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post('/api/chat', {
                subject: decodeURIComponent(subject),
                question: userMsg
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: res.data.answer,
                sources: res.data.sources 
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: 'Sorry, I encountered an error communicating with the backend brain.',
                sources: [] 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-prime flex flex-col p-4 md:p-6 pb-0">
            <header className="flex items-center gap-4 mb-4 glass p-4 rounded-2xl shrink-0">
                <Link to="/" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold flex gap-2 items-center">
                        <Bot className="w-6 h-6 text-accent" />
                        {decodeURIComponent(subject)} Study Companion
                    </h1>
                    <p className="text-sm text-gray-400">Strict mode enabled: Answers exclusively from selected materials.</p>
                </div>
            </header>

            <main className="flex-1 glass rounded-t-2xl overflow-hidden flex flex-col relative max-w-5xl mx-auto w-full">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border border-accent/40 mt-1">
                                    <Bot className="w-5 h-5 text-accent" />
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                                msg.role === 'user' 
                                ? 'bg-accent text-white rounded-tr-sm' 
                                : 'bg-sec/80 border border-white/5 rounded-tl-sm shadow-lg'
                            }`}>
                                <div className="whitespace-pre-wrap leading-relaxed">
                                    {msg.text}
                                </div>
                                
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/10">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Source References</p>
                                        <div className="flex flex-wrap gap-2">
                                            {msg.sources.map((src, idx) => (
                                                <span key={idx} className="bg-prime/50 text-accent border border-accent/20 px-2 py-1 rounded text-xs">
                                                    {src}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-prime border border-white/10 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-5 h-5 text-gray-300" />
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border border-accent/40 mt-1">
                                <Bot className="w-5 h-5 text-accent animate-pulse" />
                            </div>
                            <div className="bg-sec/80 border border-white/5 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 w-32 shadow-lg">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-sec/80 border-t border-white/5">
                    <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about the subject materials..."
                            className="flex-1 bg-prime border border-gray-600 focus:border-accent rounded-xl py-4 pl-4 pr-14 text-white focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-inner"
                            disabled={loading}
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="absolute right-2 p-2 bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-accent rounded-lg text-white transition-colors"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-500 mt-3 hidden md:block">AI models can make mistakes. The system forces the bot to prioritize uploaded context.</p>
                </div>
            </main>
        </div>
    );
}
