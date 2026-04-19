import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, LogOut, Settings, ChevronRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const res = await api.get('/admin/subjects');
                setSubjects(res.data.subjects || []);
            } catch (error) {
                console.error("Error fetching subjects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-prime p-6 relative flex flex-col">
            <header className="flex justify-between items-center bg-sec/60 backdrop-blur-xl border border-white/5 p-4 rounded-2xl mb-8 p-sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-lg shadow-lg shadow-accent/30">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="font-bold text-xl">Hello, {user.username}</h1>
                        <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {user.role === 'admin' && (
                        <Link to="/admin" className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg flex items-center gap-2 transition-colors border border-purple-500/20">
                            <Settings className="w-5 h-5" />
                            <span className="hidden sm:inline">Admin Panel</span>
                        </Link>
                    )}
                    <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Available Subjects</h2>
                    <p className="text-gray-400">Select a subject to start asking questions from its materials.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center text-accent py-20">Loading subjects...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-500 glass rounded-xl border-dashed">
                                No subjects available. {user.role === 'admin' ? 'Go to Admin Panel to upload some PDFs!' : 'Ask your admin to upload study materials.'}
                            </div>
                        ) : (
                            subjects.map((sub, idx) => (
                                <Link 
                                    to={`/chat/${encodeURIComponent(sub)}`} 
                                    key={idx}
                                    className="group glass rounded-xl p-6 hover:-translate-y-1 hover:shadow-accent/10 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/20 rounded-full blur-xl group-hover:bg-accent/40 transition-colors" />
                                    <Bookmark className="text-accent w-8 h-8 mb-4 relative z-10" />
                                    <h3 className="text-xl font-semibold mb-2 relative z-10">{sub}</h3>
                                    <div className="flex justify-between items-center mt-6 relative z-10 text-sm text-gray-400 group-hover:text-accent transition-colors">
                                        <span>Start session</span>
                                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
