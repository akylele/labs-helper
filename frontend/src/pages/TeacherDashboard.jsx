import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function TeacherDashboard({ user, onLogout, theme, onToggleTheme }) {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/submissions/all');
      setSubmissions(res.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setActionLoading(true);
    try {
      await axios.patch(`/submissions/${id}/status`, { status });
      fetchSubmissions();
    } catch (err) {
      console.error('Ошибка обновления:', err);
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

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading || actionLoading} text={actionLoading ? 'Обновляем...' : 'Загружаем данные...'} />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <h2>Фильтр по статусу</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
            style={{ width: 'auto' }}
          >
            Все ({submissions.length})
          </button>
          <button 
            className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('pending')}
            style={{ width: 'auto' }}
          >
            На проверке ({submissions.filter(s => s.status === 'pending').length})
          </button>
          <button 
            className={`btn ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('approved')}
            style={{ width: 'auto' }}
          >
            Принятые ({submissions.filter(s => s.status === 'approved').length})
          </button>
          <button 
            className={`btn ${filter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('rejected')}
            style={{ width: 'auto' }}
          >
            Отклонённые ({submissions.filter(s => s.status === 'rejected').length})
          </button>
        </div>
      </section>

      <section className="submissions-section">
        <h2>Работы студентов</h2>
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <p>Нет работ для отображения</p>
          </div>
        ) : (
          <div className="submissions-list">
            {filteredSubmissions.map((sub) => (
              <div key={sub._id} className="submission-card">
                <div className="submission-info">
                  <p className="student-name">{sub.userId?.lastName || 'Неизвестный'}</p>
                  <h3>{sub.labName}</h3>
                  <a href={sub.mrLink} target="_blank" rel="noopener noreferrer" className="mr-link">
                    {sub.mrLink}
                  </a>
                  <p className="date">{formatDate(sub.submittedAt)}</p>
                </div>
                <span className={`status-badge status-${sub.status}`}>
                  {getStatusText(sub.status)}
                </span>
                <div className="action-buttons">
                  <button 
                    className="btn-approve" 
                    onClick={() => updateStatus(sub._id, 'approved')}
                    disabled={sub.status === 'approved'}
                  >
                    ✓ Принять
                  </button>
                  <button 
                    className="btn-reject" 
                    onClick={() => updateStatus(sub._id, 'rejected')}
                    disabled={sub.status === 'rejected'}
                  >
                    ✗ Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TeacherDashboard;
