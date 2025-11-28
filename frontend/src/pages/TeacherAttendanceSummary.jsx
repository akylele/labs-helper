import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

const STATUS_CLASS = {
  present: 'attendance-summary-present',
  absent: 'attendance-summary-absent',
  late: 'attendance-summary-late'
};

function TeacherAttendanceSummary({ user, onLogout, theme, onToggleTheme }) {
  const today = new Date().toISOString().substring(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/attendance/summary', {
        params: { startDate, endDate }
      });
      setStudents(res.data.students || []);
      setAttendance(res.data.attendance || []);
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

  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.forEach((record) => {
      map[`${record.user_id}-${record.lesson_date}`] = record.status;
    });
    return map;
  }, [attendance]);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${axios.defaults.baseURL}/pdf/attendance?startDate=${startDate}&endDate=${endDate}`,
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
      a.download = `attendance_${startDate}_${endDate}.pdf`;
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
                      const status = attendanceMap[`${student.id}-${date}`];
                      const statusClass = STATUS_CLASS[status] || 'attendance-summary-empty';
                      return (
                        <td key={date} className={statusClass}>
                          {status === 'present'
                            ? '✓'
                            : status === 'absent'
                            ? '✗'
                            : status === 'late'
                            ? '⏳'
                            : ''}
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

export default TeacherAttendanceSummary;

