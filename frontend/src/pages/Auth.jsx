import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, KeyRound, CheckCircle } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // For signup only
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const handleSendOtp = async () => {
        if (!email) {
            setError('Please enter your email first.');
            return;
        }
        setError('');
        setMsg('');
        try {
            const res = await api.post('/auth/send-otp', { email });
            setOtpSent(true);
            setMsg(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMsg('');
        try {
            if (isLogin) {
                const res = await api.post('/auth/login', { email, password });
                login(res.data.token, res.data.role, res.data.email);
                
                if (res.data.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            } else {
                if (!otpSent) {
                    setError('Please verify your email first.');
                    return;
                }
                await api.post('/auth/signup', { email, password, role, otp });
                setIsLogin(true);
                setOtpSent(false);
                setOtp('');
                setMsg('Signup successful! Please login.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setMsg('');
        setOtpSent(false);
        setOtp('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-prime via-sec to-prime">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

            <div className="glass p-8 rounded-2xl w-full max-w-md z-10 mx-4 border border-white/20 shadow-2xl relative shadow-accent/10">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
                        AI Study Dashboard
                    </h2>
                    <p className="text-gray-400 mt-2">{isLogin ? 'Welcome back, Scholar' : 'Begin your journey'}</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded bg-red-500/20 text-red-300 text-sm border border-red-500/30 text-center">
                        {error}
                    </div>
                )}
                {msg && (
                    <div className="mb-4 p-3 rounded bg-green-500/20 text-green-300 text-sm border border-green-500/30 text-center">
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={!isLogin && otpSent}
                            className="w-full bg-prime/50 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
                        />
                    </div>
                    
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={!isLogin && otpSent}
                            className="w-full bg-prime/50 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
                        />
                    </div>

                    {!isLogin && !otpSent && (
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <select 
                                value={role} 
                                onChange={e => setRole(e.target.value)}
                                className="w-full bg-prime/50 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
                            >
                                <option value="user">Student (User)</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                    )}

                    {!isLogin && otpSent && (
                        <div className="relative">
                            <CheckCircle className="absolute left-3 top-3 text-green-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                required
                                className="w-full bg-prime/50 border border-green-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all"
                            />
                        </div>
                    )}

                    {!isLogin && !otpSent ? (
                        <button 
                            type="button"
                            onClick={handleSendOtp}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-purple-500/20"
                        >
                            Send OTP to Email
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-accent/20"
                        >
                            {isLogin ? 'Sign In' : 'Complete Signup'}
                        </button>
                    )}
                </form>

                <p className="mt-6 text-center text-gray-400 text-sm">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={switchMode} 
                        className="text-accent hover:text-blue-400 font-medium cursor-pointer focus:outline-none"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </p>
            </div>
        </div>
    );
}
