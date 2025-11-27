import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';

function StudentSummary({ user, onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, labsRes] = await Promise.all([
        axios.get('/submissions/my'),
        axios.get('/submissions/labs')
      ]);
      setSubmissions(subsRes.data);
      setLabs(labsRes.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  };

  const getSubmission = (labId) => {
    return submissions.find(s => s.labId === labId);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'cell-approved';
      case 'rejected': return 'cell-rejected';
      case 'pending': return 'cell-pending';
      default: return 'cell-empty';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return '✓ Принято';
      case 'rejected': return '✗ Отклонено';
      case 'pending': return '⏳ На проверке';
      default: return '—';
    }
  };

  return (
    <div className="dashboard">
      <Navigation user={user} onLogout={onLogout} />

      <section className="summary-section">
        <h2>Мои лабораторные работы</h2>
        
        {labs.length === 0 ? (
          <div className="empty-state">
            <p>Лабораторные работы ещё не добавлены</p>
          </div>
        ) : (
          <div className="student-labs-grid">
            {labs.map(lab => {
              const sub = getSubmission(lab.id);
              return (
                <div key={lab.id} className={`student-lab-card ${sub ? getStatusClass(sub.status) : 'cell-empty'}`}>
                  <h3>{lab.name}</h3>
                  <p className="status-text">{sub ? getStatusText(sub.status) : 'Не сдано'}</p>
                  {sub && (
                    <a href={sub.mrLink} target="_blank" rel="noopener noreferrer" className="mr-link-small">
                      Открыть MR
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentSummary;

