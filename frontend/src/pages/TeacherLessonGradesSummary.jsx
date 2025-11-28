import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function getGradeClass(grade) {
  if (!grade) return 'grade-summary-empty';
  // 6-10 - зеленый
  if (grade >= 6) return 'grade-summary-excellent';
  // 4-5 - желтый
  if (grade >= 4) return 'grade-summary-average';
  // 1-3 - красный
  return 'grade-summary-poor';
}

function TeacherLessonGradesSummary({ user, onLogout, theme, onToggleTheme }) {
  const today = new Date().toISOString().substring(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/grades/lessons/summary', {
        params: { startDate, endDate }
      });
      setStudents(res.data.students || []);
      setGrades(res.data.grades || []);
    } catch (error) {
      console.error('Ошибка загрузки сводки:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysRange = useMemo(() => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().substring(0, 10));
    }
    return dates;
  }, [startDate, endDate]);

  const gradesMap = useMemo(() => {
    const map = {};
    grades.forEach((record) => {
      const key = `${record.user_id}-${record.lesson_date}`;
      if (!map[key]) {
        map[key] = [];
      }
      const index = (record.grade_index || 1) - 1;
      map[key][index] = record.grade_value;
    });
    // Преобразуем массивы в строки для отображения
    const result = {};
    Object.keys(map).forEach((key) => {
      const values = map[key].filter(v => v !== undefined && v !== null);
      if (values.length > 0) {
        result[key] = values.join(', ');
      }
    });
    return result;
  }, [grades]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем сводку..." />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <div className="attendance-header">
          <div className="form-group">
            <label>С даты</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </div>
          <div className="form-group">
            <label>По дату</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>
      </section>

      <section className="summary-section">
        {students.length === 0 ? (
          <div className="empty-state">
            <p>Студенты не найдены</p>
          </div>
        ) : daysRange.length === 0 ? (
          <div className="empty-state">
            <p>Укажите корректный диапазон дат</p>
          </div>
        ) : (
          <div className="attendance-summary-table-wrapper">
            <table className="attendance-summary-table">
              <thead>
                <tr>
                  <th className="sticky-col">ФИО</th>
                  {daysRange.map((date) => (
                    <th key={date}>{formatDate(date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="sticky-col">{student.fullName || student.last_name}</td>
                    {daysRange.map((date) => {
                      const gradeStr = gradesMap[`${student.id}-${date}`];
                      // Для цветовой подсветки берем среднее значение или первую оценку
                      const gradeValues = gradeStr ? gradeStr.split(', ').map(v => Number(v)).filter(v => !isNaN(v)) : [];
                      const avgGrade = gradeValues.length > 0 ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length : null;
                      const gradeClass = getGradeClass(avgGrade);
                      return (
                        <td key={date} className={gradeClass}>
                          {gradeStr || ''}
                        </td>
                      );
                    })}
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

export default TeacherLessonGradesSummary;

