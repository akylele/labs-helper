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

function TeacherExamGradesSummary({ user, onLogout, theme, onToggleTheme }) {
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [examNames, setExamNames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/grades/exams/summary');
      setStudents(res.data.students || []);
      setGrades(res.data.grades || []);
      setExamNames(res.data.examNames || []);
    } catch (error) {
      console.error('Ошибка загрузки сводки:', error);
    } finally {
      setLoading(false);
    }
  };

  const gradesMap = useMemo(() => {
    const map = {};
    grades.forEach((record) => {
      map[`${record.user_id}-${record.exam_name}`] = record.grade_value;
    });
    return map;
  }, [grades]);

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${axios.defaults.baseURL}/pdf/exams`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка генерации PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_grades_${new Date().toISOString().substring(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка выгрузки PDF:', error);
      alert('Ошибка при выгрузке PDF');
    }
  };

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем сводку..." />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <div className="attendance-header">
          <button className="btn btn-secondary" onClick={handleExportPDF}>
            Выгрузить PDF
          </button>
        </div>
      </section>

      <section className="summary-section">
        {students.length === 0 ? (
          <div className="empty-state">
            <p>Студенты не найдены</p>
          </div>
        ) : examNames.length === 0 ? (
          <div className="empty-state">
            <p>Контрольные работы ещё не добавлены</p>
          </div>
        ) : (
          <div className="attendance-summary-table-wrapper">
            <table className="attendance-summary-table">
              <thead>
                <tr>
                  <th className="sticky-col">ФИО</th>
                  {examNames.map((examName) => (
                    <th key={examName} title={examName}>
                      {examName.length > 15 ? examName.substring(0, 15) + '...' : examName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="sticky-col">{student.fullName || student.last_name}</td>
                    {examNames.map((examName) => {
                      const grade = gradesMap[`${student.id}-${examName}`];
                      const gradeClass = getGradeClass(grade);
                      return (
                        <td key={examName} className={gradeClass}>
                          {grade || ''}
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

export default TeacherExamGradesSummary;

