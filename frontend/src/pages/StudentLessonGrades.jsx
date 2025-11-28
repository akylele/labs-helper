import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

const gradeClass = (value) => {
  if (value === null || value === undefined) return 'grade-badge-empty';
  if (value >= 85) return 'grade-badge-high';
  if (value >= 60) return 'grade-badge-mid';
  return 'grade-badge-low';
};

function StudentLessonGrades({ user, onLogout, theme, onToggleTheme }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/grades/my');
      setGrades(res.data?.lessons || []);
    } catch (error) {
      console.error('Ошибка загрузки оценок:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем оценки..." />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="summary-section">
        <h2>Оценки за занятия</h2>

        {grades.length === 0 ? (
          <div className="empty-state">
            <p>Оценки за занятия ещё не выставлены</p>
          </div>
        ) : (
          <div className="grades-list">
            {grades.map((grade) => (
              <div key={grade.id} className="grade-card">
                <div>
                  <p className="grade-date">{grade.lesson_date ? formatDate(grade.lesson_date) : '—'}</p>
                  {grade.comment && <p className="grade-comment">{grade.comment}</p>}
                </div>
                <span className={`grade-badge ${gradeClass(grade.grade_value)}`}>
                  {grade.grade_value ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentLessonGrades;

