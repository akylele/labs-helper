import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentSummary from './pages/StudentSummary';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLabs from './pages/TeacherLabs';
import TeacherSummary from './pages/TeacherSummary';
import './App.css';

axios.defaults.baseURL = process.env.NODE_ENV === 'production' 
  ? 'https://labs-helper.onrender.com/api' 
  : 'http://localhost:5050/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to={user.role === 'teacher' ? '/teacher' : '/dashboard'} /> : <LoginPage onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" /> : <RegisterPage onLogin={handleLogin} />} 
          />
          {/* Student routes */}
          <Route 
            path="/dashboard" 
            element={user && user.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/my-labs" 
            element={user && user.role === 'student' ? <StudentSummary user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          {/* Teacher routes */}
          <Route 
            path="/teacher" 
            element={user && user.role === 'teacher' ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/teacher/labs" 
            element={user && user.role === 'teacher' ? <TeacherLabs user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/teacher/summary" 
            element={user && user.role === 'teacher' ? <TeacherSummary user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? (user.role === 'teacher' ? '/teacher' : '/dashboard') : '/login'} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
