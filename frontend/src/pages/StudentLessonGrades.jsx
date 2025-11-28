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
      const allLessons = res.data?.lessons || [];
      // Группируем оценки по дате занятия
      const groupedByDate = {};
      allLessons.forEach((grade) => {
        const date = grade.lesson_date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push(grade);
      });
      // Преобразуем в массив и сортируем по дате
      const grouped = Object.entries(groupedByDate)
        .map(([date, grades]) => ({
          lesson_date: date,
          grades: grades.sort((a, b) => (a.grade_index || 1) - (b.grade_index || 1))
        }))
        .sort((a, b) => new Date(b.lesson_date) - new Date(a.lesson_date));
      setGrades(grouped);
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
            {grades.map((entry, idx) => (
              <div key={entry.lesson_date || idx} className="grade-card">
                <div>
                  <p className="grade-date">{entry.lesson_date ? formatDate(entry.lesson_date) : '—'}</p>
                  {entry.grades.some(g => g.comment) && (
                    <p className="grade-comment">
                      {entry.grades.filter(g => g.comment).map(g => g.comment).join('; ')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {entry.grades.map((grade, gradeIdx) => (
                    <span key={grade.id || gradeIdx} className={`grade-badge ${gradeClass(grade.grade_value)}`}>
                      {grade.grade_value ?? '—'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentLessonGrades;

