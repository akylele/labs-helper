import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function StudentDashboard({ user, onLogout, theme, onToggleTheme }) {
  const [submissions, setSubmissions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [labId, setLabId] = useState('');
  const [mrLink, setMrLink] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, labsRes] = await Promise.all([
        axios.get('/submissions/my'),
        axios.get('/submissions/labs')
      ]);
      setSubmissions(subsRes.data);
      setLabs(labsRes.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);

    try {
      await axios.post('/submissions', { labId, mrLink });
      setLabId('');
      setMrLink('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отправки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Отменить отправку работы?')) return;
    setActionLoading(true);
    try {
      await axios.delete(`/submissions/${id}`);
      fetchData();
    } catch (err) {
      console.error('Ошибка отмены:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Принято';
      case 'rejected': return 'Отклонено';
      default: return 'На проверке';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Фильтруем лабы которые уже сданы (кроме отклонённых)
  const submittedLabIds = submissions
    .filter(s => s.status !== 'rejected')
    .map(s => s.labId);
  const availableLabs = labs.filter(lab => !submittedLabIds.includes(lab.id));

  return (
    <div className="dashboard">
      <LoaderOverlay 
        visible={isLoading || actionLoading} 
        text={actionLoading ? 'Сохраняем...' : 'Загружаем данные...'} 
      />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <h2>Сдать лабораторную работу</h2>
        {error && <div className="error-message">{error}</div>}
        
        {availableLabs.length === 0 ? (
          <div className="empty-state">
            <p>{labs.length === 0 ? 'Преподаватель ещё не добавил лабораторные работы' : 'Вы сдали все лабораторные работы!'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="add-lab-form">
            <div className="form-group">
              <label>Лабораторная работа</label>
              <select
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                required
              >
                <option value="">Выберите лабораторную</option>
                {availableLabs.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ссылка на Merge Request</label>
              <input
                type="url"
                value={mrLink}
                onChange={(e) => setMrLink(e.target.value)}
                placeholder="https://gitlab.com/.../merge_requests/1"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              Отправить
            </button>
          </form>
        )}
      </section>

      <section className="submissions-section">
        <h2>Последние отправленные работы</h2>
        {submissions.length === 0 ? (
          <div className="empty-state">
            <p>Вы ещё не отправили ни одной работы</p>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.slice(0, 5).map((sub) => (
              <div key={sub._id} className="submission-card">
                <div className="submission-info">
                  <h3>{sub.labName}</h3>
                  <a href={sub.mrLink} target="_blank" rel="noopener noreferrer" className="mr-link">
                    {sub.mrLink}
                  </a>
                  <p className="date">{formatDate(sub.submittedAt)}</p>
                </div>
                <span className={`status-badge status-${sub.status}`}>
                  {getStatusText(sub.status)}
                </span>
                {sub.status === 'pending' && (
                  <button className="btn-cancel" onClick={() => handleCancel(sub._id)}>
                    Отменить
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentDashboard;
