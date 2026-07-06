import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Bot } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const BRANCHES = ['CSE', 'CSE(AIML)', 'CSE(DS)', 'IT', 'ECE', 'MECH', 'CIVIL', 'EEE'];
const YEARS = ['1', '2', '3', '4'];

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [year, setYear] = useState(YEARS[0]);
    
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const payload = { email, password, role };
            if (role === 'user' || role === 'teacher') {
                payload.branch = branch;
            }
            if (role === 'user') {
                payload.year = year;
            }
            
            const res = await api.post('/auth/login', payload);
            // Save token, role, email, branch, and year
            login(res.data.token, res.data.role, res.data.email, res.data.branch, res.data.year);
            
            if (res.data.role === 'admin' || res.data.role === 'teacher') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-prime p-4">
            {/* Ambient Background Glows matching ChatInterface */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none"></div>

            <div className="glass p-8 md:p-10 rounded-3xl w-full max-w-md z-10 border border-white/10 shadow-2xl relative shadow-[0_0_50px_rgba(59,130,246,0.1)] backdrop-blur-xl bg-sec/60 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-b from-sec to-prime flex items-center justify-center border border-white/10 shadow-xl mb-6 relative">
                        <Bot className="w-8 h-8 text-accent relative z-10" />
                        <div className="absolute inset-0 bg-accent/30 blur-md rounded-full animate-pulse"></div>
                    </div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                        Institutional Portal
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm font-light">Secure Login</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 text-center animate-in fade-in">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="w-full bg-prime/80 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner appearance-none cursor-pointer"
                        >
                            <option value="user">Student Portal</option>
                            <option value="teacher">Teacher Portal</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    {(role === 'user' || role === 'teacher') && (
                        <div className="flex gap-4">
                            <div className="relative group flex-1">
                                <select
                                    value={branch}
                                    onChange={e => setBranch(e.target.value)}
                                    className="w-full bg-prime/80 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            {role === 'user' && (
                                <div className="relative group w-32">
                                    <select
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="w-full bg-prime/80 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner appearance-none cursor-pointer"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-accent transition-colors w-5 h-5" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full bg-prime/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner placeholder-gray-500"
                        />
                    </div>
                    
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-accent transition-colors w-5 h-5" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full bg-prime/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner placeholder-gray-500"
                        />
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-accent to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-accent/20 mt-4"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
