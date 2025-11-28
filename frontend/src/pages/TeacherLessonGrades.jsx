import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function TeacherLessonGrades({ user, onLogout, theme, onToggleTheme }) {
  const today = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedEntries, setChangedEntries] = useState({});

  useEffect(() => {
    fetchGrades(selectedDate);
  }, [selectedDate]);

  const fetchGrades = async (date) => {
    setLoading(true);
    setChangedEntries({});
    try {
      const res = await axios.get('/grades/lessons', { params: { date } });
      setStudents(res.data.students || []);
    } catch (error) {
      console.error('Ошибка загрузки оценок:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (userId, value) => {
    const current = students.find((s) => s.id === userId);
    const numeric = value === '' ? '' : Math.max(0, Math.min(100, Number(value)));
    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? { ...student, grade: { ...(student.grade || {}), grade_value: numeric } }
          : student
      )
    );
    setChangedEntries((prev) => ({
      ...prev,
      [userId]: {
        gradeValue: numeric === '' ? null : numeric,
        comment: prev[userId]?.comment ?? (current?.grade?.comment || '')
      }
    }));
  };

  const handleCommentChange = (userId, comment) => {
    const current = students.find((s) => s.id === userId);
    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? { ...student, grade: { ...(student.grade || {}), comment } }
          : student
      )
    );
    setChangedEntries((prev) => ({
      ...prev,
      [userId]: {
        gradeValue:
          prev[userId]?.gradeValue ??
          current?.grade?.grade_value ??
          null,
        comment
      }
    }));
  };

  const entriesToSave = useMemo(() => {
    return Object.entries(changedEntries)
      .map(([userId, payload]) => ({
        userId,
        gradeValue: payload.gradeValue,
        comment: payload.comment
      }))
      .filter((entry) => entry.gradeValue !== null && entry.gradeValue !== undefined && entry.gradeValue !== '');
  }, [changedEntries]);

  const handleSave = async () => {
    if (!entriesToSave.length) return;
    setSaving(true);
    try {
      await axios.post('/grades/lessons/bulk', {
        lessonDate: selectedDate,
        entries: entriesToSave
      });
      await fetchGrades(selectedDate);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading || saving} text={saving ? 'Сохраняем оценки...' : 'Загружаем данные...'} />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <div className="attendance-header">
          <div className="form-group">
            <label>Дата занятия</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={!entriesToSave.length || saving}
            onClick={handleSave}
          >
            Сохранить ({entriesToSave.length})
          </button>
        </div>
      </section>

      <section className="summary-section">
        {students.length === 0 ? (
          <div className="empty-state">
            <p>Студенты не найдены</p>
          </div>
        ) : (
          <div className="grades-table-wrapper">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Фамилия</th>
                  <th>Оценка</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.lastName}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={student.grade?.grade_value ?? ''}
                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Комментарий (опционально)"
                        value={student.grade?.comment || ''}
                        onChange={(e) => handleCommentChange(student.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TeacherLessonGrades;

