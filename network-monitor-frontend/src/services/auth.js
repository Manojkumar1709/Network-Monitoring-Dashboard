import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const loginAPI = async (credentials) => {
  const res = await axios.post(`${API_URL}/login`, credentials);
  return res.data;
};

export const signupAPI = async (userData) => {
  const res = await axios.post(`${API_URL}/signup`, userData);
  return res.data;
};