import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, FileText, AlertCircle, Users, UserPlus } from 'lucide-react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

const BRANCHES = ['CSE', 'CSE(AIML)', 'CSE(DS)', 'IT', 'ECE', 'MECH', 'CIVIL', 'EEE'];
const YEARS = ['1', '2', '3', '4'];

export default function AdminPanel() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'users'
    
    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [subject, setSubject] = useState('');
    const [branch, setBranch] = useState(BRANCHES[0]);
    const [year, setYear] = useState(YEARS[0]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user', branch: BRANCHES[0], year: YEARS[0] });

    const getTeacherYears = () => {
        if (!user || user.role !== 'teacher' || !user.year) return [];
        try {
            const parsed = JSON.parse(user.year);
            return Array.isArray(parsed) ? parsed : [user.year];
        } catch {
            return [user.year];
        }
    };

    useEffect(() => {
        if (user?.role === 'teacher') {
            const ty = getTeacherYears();
            if (ty.length > 0 && !ty.includes(year)) {
                setYear(ty[0]);
            }
        }
    }, [user, year]);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/admin/documents');
            setDocuments(res.data.documents || []);
        } catch (err) {
            setError('Failed to load documents');
        }
    };

    const fetchUsers = async () => {
        if (user?.role !== 'admin') return;
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data.users || []);
        } catch (err) {
            setError('Failed to load users');
        }
    };

    useEffect(() => {
        fetchDocuments();
        if (user?.role === 'admin') fetchUsers();
    }, [user]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !subject.trim()) {
            setError('Please provide a file and a subject name.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject.trim());
        formData.append('branch', user?.role === 'teacher' ? user.branch : branch);
        formData.append('year', year);

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/admin/upload-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccess('Document uploaded and ingested successfully.');
            setFile(null);
            setSubject('');
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDoc = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            await api.post('/admin/delete-pdf', { filename });
            setSuccess(`Deleted ${filename}.`);
            fetchDocuments();
        } catch (err) {
            setError('Failed to delete document.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/admin/create-user', newUser);
            setSuccess('User created successfully.');
            setNewUser({ email: '', password: '', role: 'user', branch: BRANCHES[0], year: YEARS[0] });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (email) => {
        if (!window.confirm(`Delete user ${email}?`)) return;
        try {
            await api.post('/admin/delete-user', { email });
            setSuccess(`Deleted user ${email}.`);
            fetchUsers();
        } catch (err) {
            setError('Failed to delete user.');
        }
    };

    return (
        <div className="min-h-screen bg-prime p-6 relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Institutional Control Center</h1>
                        <p className="text-gray-400 text-sm">Role: <span className="text-accent uppercase font-medium">{user?.role}</span></p>
                    </div>
                </div>
                {user?.role === 'admin' && (
                    <div className="flex gap-2 bg-sec/50 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('documents')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'documents' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Knowledge Base
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            User Provisioning
                        </button>
                    </div>
                )}
            </header>

            <div className="max-w-7xl mx-auto">
                {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 text-sm rounded border border-red-500/30 flex gap-2 items-start"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-500/20 text-green-300 text-sm rounded border border-green-500/30">{success}</div>}

                {activeTab === 'documents' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Upload Section */}
                        <div className="glass p-6 rounded-2xl h-fit">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-accent" />
                                Ingest Subject Material
                            </h2>

                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Branch</label>
                                    <select 
                                        value={user?.role === 'teacher' ? user.branch : branch} 
                                        onChange={e => setBranch(e.target.value)}
                                        disabled={user?.role === 'teacher'}
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Year</label>
                                    <select 
                                        value={year} onChange={e => setYear(e.target.value)}
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                    >
                                        {(user?.role === 'teacher' ? getTeacherYears() : YEARS).map(y => <option key={y} value={y}>Year {y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Subject / Category</label>
                                    <input 
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g. Data Structures"
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">PDF Document</label>
                                    <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-accent transition-colors bg-prime/50">
                                        <input 
                                            type="file" 
                                            id="file-upload"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            required
                                        />
                                        {file ? (
                                            <div className="text-accent flex flex-col items-center">
                                                <FileText className="w-8 h-8 mb-2" />
                                                <span className="text-sm break-all">{file.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 flex flex-col items-center">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="text-sm">Click or drag a PDF file here</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex justify-center"
                                >
                                    {loading ? <span className="animate-pulse">Processing Vector DB...</span> : 'Upload & Train Model'}
                                </button>
                            </form>
                        </div>

                        {/* Documents Table */}
                        <div className="lg:col-span-2 glass p-6 rounded-2xl overflow-hidden flex flex-col">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-accent" />
                                Curriculum Knowledge Base
                            </h2>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                            <th className="pb-3 pr-4 font-medium">Filename</th>
                                            <th className="pb-3 pr-4 font-medium">Subject</th>
                                            <th className="pb-3 pr-4 font-medium">Branch/Year</th>
                                            <th className="pb-3 pr-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8 text-gray-500">No documents ingested yet.</td>
                                            </tr>
                                        ) : (
                                            documents.map((doc, idx) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-xs">
                                                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                                            <span className="truncate" title={doc.filename}>{doc.filename}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                                            {doc.subject}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4 text-sm text-gray-400 whitespace-nowrap">
                                                        {doc.branch} - Yr {doc.year}
                                                    </td>
                                                    <td className="py-4 pr-4 text-right">
                                                        <button 
                                                            onClick={() => handleDeleteDoc(doc.filename)}
                                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all font-medium"
                                                            title="Delete document"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Create User Section */}
                        <div className="glass p-6 rounded-2xl h-fit">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-accent" />
                                Provision Account
                            </h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                    <input 
                                        type="email" required
                                        value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                    <input 
                                        type="password" required
                                        value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                                    <select 
                                        value={newUser.role} onChange={e => {
                                            const newRole = e.target.value;
                                            setNewUser({
                                                ...newUser, 
                                                role: newRole, 
                                                year: newRole === 'teacher' ? [] : YEARS[0]
                                            });
                                        }}
                                        className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                    >
                                        <option value="user">Student (User)</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                {(newUser.role === 'user' || newUser.role === 'teacher') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Branch</label>
                                            <select 
                                                value={newUser.branch} onChange={e => setNewUser({...newUser, branch: e.target.value})}
                                                className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                            >
                                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        {newUser.role === 'user' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Year</label>
                                                <select 
                                                    value={newUser.year} onChange={e => setNewUser({...newUser, year: e.target.value})}
                                                    className="w-full bg-prime/50 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-accent"
                                                >
                                                    {YEARS.map(y => <option key={y} value={y}>Yr {y}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {newUser.role === 'teacher' && (
                                            <div className="col-span-2 mt-2">
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Assigned Years</label>
                                                <div className="flex flex-wrap gap-3">
                                                    {YEARS.map(y => (
                                                        <label key={y} className="flex items-center gap-2 text-white bg-prime/50 px-3 py-2 rounded-lg border border-gray-600 cursor-pointer hover:border-accent transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={Array.isArray(newUser.year) && newUser.year.includes(y)}
                                                                onChange={(e) => {
                                                                    const currentYears = Array.isArray(newUser.year) ? newUser.year : [];
                                                                    if (e.target.checked) {
                                                                        setNewUser({...newUser, year: [...currentYears, y]});
                                                                    } else {
                                                                        setNewUser({...newUser, year: currentYears.filter(yr => yr !== y)});
                                                                    }
                                                                }}
                                                                className="accent-accent w-4 h-4 cursor-pointer"
                                                            />
                                                            <span className="text-sm font-medium">Year {y}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-3 rounded-lg mt-2">
                                    Create Account
                                </button>
                            </form>
                        </div>
                        {/* Users Table */}
                        <div className="lg:col-span-2 glass p-6 rounded-2xl overflow-hidden flex flex-col">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-accent" />
                                Registered Users
                            </h2>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                            <th className="pb-3 pr-4 font-medium">Email</th>
                                            <th className="pb-3 pr-4 font-medium">Role</th>
                                            <th className="pb-3 pr-4 font-medium">Branch/Year</th>
                                            <th className="pb-3 pr-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 pr-4 truncate">{u.email}</td>
                                                <td className="py-4 pr-4">
                                                    <span className={`px-2 py-1 text-xs rounded border whitespace-nowrap ${
                                                        u.role === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                                                        u.role === 'teacher' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                                        'bg-green-500/20 text-green-300 border-green-500/30'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 text-sm text-gray-400">
                                                    {(u.role === 'user' || u.role === 'teacher') && u.branch 
                                                        ? `${u.branch} ${u.year ? (u.role === 'teacher' ? `- Yrs: ${(() => {
                                                            try {
                                                                const parsed = JSON.parse(u.year);
                                                                return Array.isArray(parsed) ? parsed.join(', ') : u.year;
                                                            } catch {
                                                                return u.year;
                                                            }
                                                        })()}` : `- Yr ${u.year}`) : ''}` 
                                                        : '-'}
                                                </td>
                                                <td className="py-4 pr-4 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.email)}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-all font-medium"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
