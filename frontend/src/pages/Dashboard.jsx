import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, LogOut, Settings, ChevronRight, Filter } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

const BRANCHES = ['CSE', 'CSE(AIML)', 'CSE(DS)', 'IT', 'ECE', 'MECH', 'CIVIL', 'EEE'];
const YEARS = ['1', '2', '3', '4'];

export default function Dashboard() {
    const { user, logout } = useContext(AuthContext);
    
    // Default to the user's assigned branch/year, or first option if admin/not set
    const [selectedBranch, setSelectedBranch] = useState(user?.branch || BRANCHES[0]);
    const [selectedYear, setSelectedYear] = useState(user?.year || YEARS[0]);
    
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSubjects = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/admin/subjects?branch=${encodeURIComponent(selectedBranch)}&year=${encodeURIComponent(selectedYear)}`);
                setSubjects(res.data.subjects || []);
            } catch (error) {
                console.error("Error fetching subjects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubjects();
    }, [selectedBranch, selectedYear]);

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-prime p-6 relative flex flex-col">
            <header className="flex justify-between items-center bg-sec/60 backdrop-blur-xl border border-white/5 p-4 rounded-2xl mb-8 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-lg shadow-lg shadow-accent/30">
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="font-bold text-xl">Hello, {user.email}</h1>
                        <p className="text-xs text-gray-400 capitalize">{user.role} {user.branch && `- ${user.branch}`}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {(user.role === 'admin' || user.role === 'teacher') && (
                        <Link to="/admin" className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg flex items-center gap-2 transition-colors border border-purple-500/20">
                            <Settings className="w-5 h-5" />
                            <span className="hidden sm:inline">{user.role === 'admin' ? 'Admin Panel' : 'Teacher Portal'}</span>
                        </Link>
                    )}
                    <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Institutional Curriculum</h2>
                        <p className="text-gray-400">Select your branch and year to access relevant subjects.</p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-sec/50 p-2 rounded-xl border border-white/5 backdrop-blur-md">
                        <Filter className="w-5 h-5 text-gray-500 ml-2" />
                        <select 
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={user.role === 'user'}
                            className="bg-prime border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            disabled={user.role === 'user'}
                            className="bg-prime border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center text-accent py-20">Loading curriculum...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-500 glass rounded-xl border-dashed">
                                No subjects available for {selectedBranch} (Year {selectedYear}).
                            </div>
                        ) : (
                            subjects.map((sub, idx) => (
                                <Link 
                                    to={`/chat/${encodeURIComponent(sub)}?branch=${encodeURIComponent(selectedBranch)}&year=${encodeURIComponent(selectedYear)}`} 
                                    key={idx}
                                    className="group glass rounded-xl p-6 hover:-translate-y-1 hover:shadow-accent/10 transition-all cursor-pointer relative overflow-hidden flex flex-col"
                                >
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/20 rounded-full blur-xl group-hover:bg-accent/40 transition-colors" />
                                    <Bookmark className="text-accent w-8 h-8 mb-4 relative z-10" />
                                    <div className="mb-2 relative z-10 text-xs font-semibold text-accent/80 tracking-widest uppercase">
                                        {selectedBranch} &bull; YR {selectedYear}
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 relative z-10 flex-1">{sub}</h3>
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
