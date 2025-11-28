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
  const [originalEntries, setOriginalEntries] = useState({});

  useEffect(() => {
    fetchGrades(selectedDate);
  }, [selectedDate]);

  const fetchGrades = async (date) => {
    setLoading(true);
    try {
      const res = await axios.get('/grades/lessons', { params: { date } });
      const loadedStudents = res.data.students || [];
      setStudents(loadedStudents);
      
      // Инициализируем changedEntries и originalEntries со всеми текущими оценками
      const initialEntries = {};
      const originalData = {};
      loadedStudents.forEach((student) => {
        const grades = student.grades || [null, null, null];
        const gradesData = grades.map((g) => ({
          gradeValue: g?.grade_value ?? null,
          comment: g?.comment ?? ''
        }));
        initialEntries[student.id] = { grades: gradesData };
        originalData[student.id] = { grades: gradesData.map(g => ({ ...g })) }; // Копия для сравнения
      });
      setChangedEntries(initialEntries);
      setOriginalEntries(originalData);
    } catch (error) {
      console.error('Ошибка загрузки оценок:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (userId, gradeIndex, value) => {
    const numeric = value === '' ? '' : Math.max(0, Math.min(10, Number(value)));
    setStudents((prev) => {
      const updated = prev.map((student) => {
        if (student.id !== userId) return student;
        const grades = [...(student.grades || [null, null, null])];
        if (grades[gradeIndex]) {
          grades[gradeIndex] = { ...grades[gradeIndex], grade_value: numeric };
        } else {
          grades[gradeIndex] = { grade_value: numeric, comment: '', grade_index: gradeIndex + 1 };
        }
        return { ...student, grades };
      });
      
      // Обновляем changedEntries, сохраняя все три оценки из обновленного состояния
      setChangedEntries((prevEntries) => {
        const student = updated.find((s) => s.id === userId);
        const currentGrades = student?.grades || [null, null, null];
        const newGrades = currentGrades.map((g, idx) => {
          if (idx === gradeIndex) {
            return {
              gradeValue: numeric === '' ? null : numeric,
              comment: g?.comment || ''
            };
          }
          return {
            gradeValue: g?.grade_value ?? null,
            comment: g?.comment ?? ''
          };
        });
        return { ...prevEntries, [userId]: { grades: newGrades } };
      });
      
      return updated;
    });
  };

  const handleCommentChange = (userId, gradeIndex, comment) => {
    setStudents((prev) => {
      const updated = prev.map((student) => {
        if (student.id !== userId) return student;
        const grades = [...(student.grades || [null, null, null])];
        if (grades[gradeIndex]) {
          grades[gradeIndex] = { ...grades[gradeIndex], comment };
        } else {
          grades[gradeIndex] = { grade_value: '', comment, grade_index: gradeIndex + 1 };
        }
        return { ...student, grades };
      });
      
      // Обновляем changedEntries, сохраняя все три оценки из обновленного состояния
      setChangedEntries((prevEntries) => {
        const student = updated.find((s) => s.id === userId);
        const currentGrades = student?.grades || [null, null, null];
        const newGrades = currentGrades.map((g, idx) => {
          if (idx === gradeIndex) {
            return {
              gradeValue: g?.grade_value ?? null,
              comment: comment
            };
          }
          return {
            gradeValue: g?.grade_value ?? null,
            comment: g?.comment ?? ''
          };
        });
        return { ...prevEntries, [userId]: { grades: newGrades } };
      });
      
      return updated;
    });
  };

  const entriesToSave = useMemo(() => {
    // Включаем всех студентов, у которых были изменения (даже если все оценки пустые - для удаления)
    return Object.entries(changedEntries)
      .map(([userId, payload]) => ({
        userId,
        grades: (payload.grades || []).map((g, idx) => ({
          gradeValue: g?.gradeValue ?? null,
          comment: g?.comment ?? ''
        }))
      }));
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
                  <th>Оценка 1</th>
                  <th>Комментарий 1</th>
                  <th>Оценка 2</th>
                  <th>Комментарий 2</th>
                  <th>Оценка 3</th>
                  <th>Комментарий 3</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const grades = student.grades || [null, null, null];
                  const originalGrades = originalEntries[student.id]?.grades || [null, null, null];
                  return (
                    <tr key={student.id}>
                      <td>{student.fullName || student.lastName}</td>
                      {[0, 1, 2].map((index) => {
                        const currentGrade = grades[index]?.grade_value ?? null;
                        const currentComment = grades[index]?.comment ?? '';
                        const originalGrade = originalGrades[index]?.gradeValue ?? null;
                        const originalComment = originalGrades[index]?.comment ?? '';
                        const isChanged = currentGrade !== originalGrade || currentComment !== originalComment;
                        return (
                          <React.Fragment key={index}>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={currentGrade ?? ''}
                                onChange={(e) => handleGradeChange(student.id, index, e.target.value)}
                                className={isChanged ? 'grade-input-changed' : ''}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                placeholder="Комментарий (опционально)"
                                value={currentComment}
                                onChange={(e) => handleCommentChange(student.id, index, e.target.value)}
                                className={isChanged ? 'grade-input-changed' : ''}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TeacherLessonGrades;

