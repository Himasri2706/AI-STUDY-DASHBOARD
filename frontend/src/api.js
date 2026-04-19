import axios from 'axios';

const api = axios.create({
    baseURL: 'https://ai-study-dashboard-mzx2.onrender.com',
});

// Interceptor to add JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
