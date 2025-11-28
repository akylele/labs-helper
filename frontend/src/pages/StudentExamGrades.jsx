import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

const gradeClass = (value) => {
  if (value === null || value === undefined) return 'grade-badge-empty';
  // 6-10 - зеленый
  if (value >= 6) return 'grade-badge-high';
  // 4-5 - желтый
  if (value >= 4) return 'grade-badge-mid';
  // 1-3 - красный
  return 'grade-badge-low';
};

function StudentExamGrades({ user, onLogout, theme, onToggleTheme }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/grades/my');
      setGrades(res.data?.exams || []);
    } catch (error) {
      console.error('Ошибка загрузки контрольных:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем оценки..." />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="summary-section">
        <h2>Контрольные</h2>

        {grades.length === 0 ? (
          <div className="empty-state">
            <p>Контрольные ещё не оценены</p>
          </div>
        ) : (
          <div className="grades-list">
            {grades.map((grade) => (
              <div key={grade.id} className="grade-card">
                <div>
                  <p className="grade-title">{grade.exam_name || 'Без названия'}</p>
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

export default StudentExamGrades;

