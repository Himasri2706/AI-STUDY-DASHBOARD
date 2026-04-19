import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, FileText, AlertCircle } from 'lucide-react';
import api from '../api';

export default function AdminPanel() {
    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [subject, setSubject] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/admin/documents');
            setDocuments(res.data.documents || []);
        } catch (err) {
            setError('Failed to load documents');
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

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
            // Reset file input
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed due to AI processing error.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
        
        try {
            await api.post('/admin/delete-pdf', { filename });
            setSuccess(`Deleted ${filename}.`);
            fetchDocuments();
        } catch (err) {
            setError('Failed to delete document.');
        }
    };

    return (
        <div className="min-h-screen bg-prime p-6 relative">
            <header className="flex items-center gap-4 mb-8">
                <Link to="/" className="p-2 glass rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Admin Management Center</h1>
                    <p className="text-gray-400 text-sm">Upload context documents to train knowledge base</p>
                </div>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Section */}
                <div className="glass p-6 rounded-2xl h-fit">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-accent" />
                        Ingest New Document
                    </h2>

                    {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 text-sm rounded border border-red-500/30 flex gap-2 items-start"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>{error}</div>}
                    {success && <div className="mb-4 p-3 bg-green-500/20 text-green-300 text-sm rounded border border-green-500/30">{success}</div>}

                    <form onSubmit={handleUpload} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Subject / Category</label>
                            <input 
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Machine Learning"
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
                        Knowledge Base Archive
                    </h2>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                    <th className="pb-3 pr-4 font-medium">Filename</th>
                                    <th className="pb-3 pr-4 font-medium">Subject Tag</th>
                                    <th className="pb-3 pr-4 font-medium">Uploaded At</th>
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
                                                {new Date(doc.upload_date).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <button 
                                                    onClick={() => handleDelete(doc.filename)}
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
        </div>
    );
}
