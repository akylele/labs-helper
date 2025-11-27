import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';

function TeacherLabs({ user, onLogout }) {
  const [labs, setLabs] = useState([]);
  const [newLabName, setNewLabName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const res = await axios.get('/submissions/labs');
      setLabs(res.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/submissions/labs', { name: newLabName });
      setNewLabName('');
      fetchLabs();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить лабораторную работу?')) return;
    
    try {
      await axios.delete(`/submissions/labs/${id}`);
      fetchLabs();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  return (
    <div className="dashboard">
      <Navigation user={user} onLogout={onLogout} />

      <section className="add-lab-section">
        <h2>Добавить лабораторную работу</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="add-lab-form" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="form-group">
            <label>Название лабораторной</label>
            <input
              type="text"
              value={newLabName}
              onChange={(e) => setNewLabName(e.target.value)}
              placeholder="Лабораторная 1 — Введение в Git"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Добавление...' : 'Добавить'}
          </button>
        </form>
      </section>

      <section className="submissions-section">
        <h2>Список лабораторных работ</h2>
        {labs.length === 0 ? (
          <div className="empty-state">
            <p>Лабораторные работы ещё не добавлены</p>
          </div>
        ) : (
          <div className="labs-list">
            {labs.map((lab, index) => (
              <div key={lab.id} className="lab-card">
                <span className="lab-number">{index + 1}</span>
                <span className="lab-name">{lab.name}</span>
                <button 
                  className="btn-delete"
                  onClick={() => handleDelete(lab.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TeacherLabs;

