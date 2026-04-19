import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import ChatInterface from './pages/ChatInterface';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-accent">Loading...</div>;
    
    if (!user) return <Navigate to="/auth" />;
    
    if (requireAdmin && user.role !== 'admin') return <Navigate to="/" />;

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                    <AdminPanel />
                </ProtectedRoute>
            } />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            
            <Route path="/chat/:subject" element={
                <ProtectedRoute>
                    <ChatInterface />
                </ProtectedRoute>
            } />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;
