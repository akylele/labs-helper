import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

const STATUS_LABELS = {
  present: 'Присутствовал',
  absent: 'Отсутствовал',
  late: 'Опоздал'
};

function StudentAttendance({ user, onLogout, theme, onToggleTheme }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/attendance/my');
      setRecords(res.data);
    } catch (error) {
      console.error('Ошибка загрузки посещаемости:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем посещаемость..." />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="summary-section">
        <h2>Моя посещаемость</h2>

        {records.length === 0 ? (
          <div className="empty-state">
            <p>Занятий ещё не отмечено</p>
          </div>
        ) : (
          <div className="attendance-list">
            {records.map((record) => (
              <div key={record.id} className={`attendance-card status-${record.status}`}>
                <div>
                  <p className="attendance-date">
                    {new Date(record.lesson_date).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="attendance-status">{STATUS_LABELS[record.status] || '—'}</p>
                </div>
                {record.comment && <p className="attendance-comment">{record.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentAttendance;

