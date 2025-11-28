import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

const STATUSES = [
  { value: 'present', label: 'Присутствовал' },
  { value: 'absent', label: 'Отсутствовал' },
  { value: 'late', label: 'Опоздал' }
];

function TeacherAttendance({ user, onLogout, theme, onToggleTheme }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedEntries, setChangedEntries] = useState({});

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const fetchAttendance = async (date) => {
    setLoading(true);
    setChangedEntries({});
    try {
      const res = await axios.get('/attendance', { params: { date } });
      setStudents(res.data.students || []);
    } catch (error) {
      console.error('Ошибка загрузки посещаемости:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (userId, status) => {
    const current = students.find((s) => s.id === userId);
    const currentComment = current?.attendance?.comment || '';

    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? {
              ...student,
              attendance: { ...(student.attendance || {}), status }
            }
          : student
      )
    );

    setChangedEntries((prev) => ({
      ...prev,
      [userId]: {
        status,
        comment: prev[userId]?.comment ?? currentComment
      }
    }));
  };

  const handleCommentChange = (userId, comment) => {
    const current = students.find((s) => s.id === userId);
    const currentStatus = current?.attendance?.status || '';

    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? {
              ...student,
              attendance: { ...(student.attendance || {}), comment }
            }
          : student
      )
    );

    setChangedEntries((prev) => ({
      ...prev,
      [userId]: {
        status: (prev[userId]?.status ?? currentStatus) || STATUSES[0].value,
        comment
      }
    }));
  };

  const entriesToSave = useMemo(() => {
    return Object.entries(changedEntries).map(([userId, values]) => ({
      userId,
      status: values.status,
      comment: values.comment
    }));
  }, [changedEntries]);

  const handleSave = async () => {
    if (!entriesToSave.length) return;

    setSaving(true);
    try {
      await axios.post('/attendance/bulk', {
        lessonDate: selectedDate,
        entries: entriesToSave
      });
      await fetchAttendance(selectedDate);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading || saving} text={saving ? 'Сохраняем посещаемость...' : 'Загружаем данные...'} />
      <Navigation user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />

      <section className="add-lab-section">
        <div className="attendance-header">
          <div className="form-group">
            <label>Дата занятия</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().substring(0, 10)}
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
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Статус</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.fullName || student.lastName}</td>
                    <td>
                      <div className="attendance-buttons">
                        <button
                          type="button"
                          className={`attendance-btn attendance-btn-present ${student.attendance?.status === 'present' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(student.id, 'present')}
                          title="Присутствовал"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className={`attendance-btn attendance-btn-absent ${student.attendance?.status === 'absent' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          title="Отсутствовал"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className={`attendance-btn attendance-btn-late ${student.attendance?.status === 'late' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(student.id, 'late')}
                          title="Опоздал"
                        >
                          0
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Комментарий (опционально)"
                        value={student.attendance?.comment || ''}
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

export default TeacherAttendance;

