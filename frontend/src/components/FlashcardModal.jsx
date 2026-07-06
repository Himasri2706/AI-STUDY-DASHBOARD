import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import api from '../api';

export default function FlashcardModal({ isOpen, onClose, subject, branch, year }) {
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchFlashcards();
        }
    }, [isOpen, subject, branch, year]);

    const fetchFlashcards = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/flashcards', {
                subject: decodeURIComponent(subject),
                branch,
                year
            });
            if (res.data.flashcards && res.data.flashcards.length > 0) {
                setFlashcards(res.data.flashcards);
                setCurrentIndex(0);
                setIsFlipped(false);
            } else {
                setError('No flashcards could be generated from the available materials.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate flashcards.');
        } finally {
            setLoading(false);
        }
    };

    const nextCard = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl bg-prime border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">⚡</span> AI Flashcards
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full" style={{ perspective: '1000px' }}>
                    {loading ? (
                        <div className="flex flex-col items-center text-accent">
                            <Loader2 className="w-12 h-12 animate-spin mb-4" />
                            <p className="text-gray-300 font-medium">Scanning syllabus & generating cards...</p>
                            <p className="text-gray-500 text-sm mt-2">This usually takes about 5 seconds.</p>
                        </div>
                    ) : error ? (
                        <div className="text-red-400 text-center">
                            <p>{error}</p>
                            <button onClick={fetchFlashcards} className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 mx-auto">
                                <RefreshCw className="w-4 h-4" /> Try Again
                            </button>
                        </div>
                    ) : flashcards.length > 0 ? (
                        <div className="w-full h-full max-h-[350px] relative cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                            <div className="w-full h-full transition-transform duration-500 relative" style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                                {/* Front */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-2 border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl hover:border-indigo-500/50 transition-colors" style={{ backfaceVisibility: 'hidden' }}>
                                    <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-indigo-400">Question</span>
                                    <h3 className="text-2xl md:text-3xl text-center font-bold text-white leading-tight">
                                        {flashcards[currentIndex].q}
                                    </h3>
                                    <span className="absolute bottom-4 text-gray-500 text-sm flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Click to flip
                                    </span>
                                </div>
                                {/* Back */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl overflow-y-auto" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <span className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-emerald-400">Answer</span>
                                    <p className="text-lg md:text-xl text-center text-gray-200 leading-relaxed mt-4">
                                        {flashcards[currentIndex].a}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer Controls */}
                {!loading && !error && flashcards.length > 0 && (
                    <div className="flex items-center justify-between mt-8">
                        <button 
                            onClick={prevCard} 
                            disabled={currentIndex === 0}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        
                        <div className="flex flex-col items-center">
                            <span className="text-white font-medium">Card {currentIndex + 1} of {flashcards.length}</span>
                            <div className="flex gap-1 mt-2">
                                {flashcards.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-accent' : 'w-1.5 bg-white/20'}`} />
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={nextCard} 
                            disabled={currentIndex === flashcards.length - 1}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
