import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function TeacherExamGrades({ user, onLogout, theme, onToggleTheme }) {
  const [examNames, setExamNames] = useState([]);
  const [selectedExamOption, setSelectedExamOption] = useState('');
  const [customExamName, setCustomExamName] = useState('');
  const [currentExamName, setCurrentExamName] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedEntries, setChangedEntries] = useState({});

  useEffect(() => {
    fetchExamNames();
  }, []);

  useEffect(() => {
    if (selectedExamOption && selectedExamOption !== '__new__') {
      setCurrentExamName(selectedExamOption);
      loadExam(selectedExamOption);
    }
  }, [selectedExamOption]);

  const fetchExamNames = async () => {
    try {
      const res = await axios.get('/grades/exams/list');
      const names = res.data || [];
      setExamNames(names);
      if (names.length > 0) {
        setSelectedExamOption(names[0]);
      } else {
        setSelectedExamOption('__new__');
        setLoading(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки списка контрольных:', error);
      setLoading(false);
    }
  };

  const loadExam = async (name) => {
    if (!name) return;
    setLoading(true);
    setChangedEntries({});
    try {
      const res = await axios.get('/grades/exams', { params: { name } });
      setStudents(res.data.students || []);
    } catch (error) {
      console.error('Ошибка загрузки контрольной:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareNewExam = () => {
    if (!customExamName.trim()) return;
    setCurrentExamName(customExamName.trim());
    loadExam(customExamName.trim());
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
    if (!entriesToSave.length || !currentExamName) return;
    setSaving(true);
    try {
      await axios.post('/grades/exams/bulk', {
        examName: currentExamName,
        entries: entriesToSave
      });
      await loadExam(currentExamName);
      if (!examNames.includes(currentExamName)) {
        setExamNames((prev) => [...prev, currentExamName].sort());
      }
    } catch (error) {
      console.error('Ошибка сохранения контрольной:', error);
    } finally {
      setSaving(false);
    }
  };

  const disableSave = !entriesToSave.length || !currentExamName || saving;

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading || saving} text={saving ? 'Сохраняем оценки...' : 'Загружаем данные...'} />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <div className="attendance-header">
          <div className="form-group">
            <label>Контрольная</label>
            <select
              value={selectedExamOption}
              onChange={(e) => setSelectedExamOption(e.target.value)}
            >
              <option value="" disabled>
                Выберите контрольную
              </option>
              {(examNames || []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="__new__">+ Новая контрольная</option>
            </select>
          </div>
          {selectedExamOption === '__new__' && (
            <div className="form-group" style={{ flex: 1 }}>
              <label>Название контрольной</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={customExamName}
                  onChange={(e) => setCustomExamName(e.target.value)}
                  placeholder="Например, Контрольная №2"
                />
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handlePrepareNewExam}
                  disabled={!customExamName.trim()}
                >
                  Подготовить
                </button>
              </div>
            </div>
          )}
          <button className="btn btn-primary" disabled={disableSave} onClick={handleSave}>
            Сохранить ({entriesToSave.length})
          </button>
        </div>
      </section>

      <section className="summary-section">
        {!currentExamName ? (
          <div className="empty-state">
            <p>Выберите или создайте контрольную</p>
          </div>
        ) : students.length === 0 ? (
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
                    <td>{student.fullName || student.lastName}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="10"
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

export default TeacherExamGrades;

