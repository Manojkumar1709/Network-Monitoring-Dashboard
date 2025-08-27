// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Your backend URL

// Function to get the auth token from storage (e.g., localStorage)
const getToken = () => localStorage.getItem('token');

// Create an Axios instance with default headers
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token in every request
apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// ... your other api functions like getDevices, addDevice etc.

/**
 * @desc    Admin adds a new user
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
export const addUser = async (userData) => {
    const { data } = await apiClient.post('/admin/users', userData);
    return data;
};