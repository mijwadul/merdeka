import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...response.data, token });
    } catch (error) {
      console.error("Session invalid, logging out.");
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUserProfile(token);
    }
    setLoading(false);
  }, []);
  
  const login = async (loginIdentifier, password) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      login: loginIdentifier,
      password,
    });
    const token = response.data.token;
    localStorage.setItem('authToken', token);
    await fetchUserProfile(token); // Fetch profile and set user state
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;