import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';
import LoaderOverlay from '../components/LoaderOverlay';

function TeacherSummary({ user, onLogout }) {
  const [data, setData] = useState({ students: [], labs: [], submissions: [] });
  const [filterName, setFilterName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/submissions/summary');
      setData(res.data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSubmission = (studentId, labId) => {
    return data.submissions.find(s => s.user_id === studentId && s.lab_id === labId);
  };

  const getCellClass = (status) => {
    switch (status) {
      case 'approved': return 'cell-approved';
      case 'rejected': return 'cell-rejected';
      case 'pending': return 'cell-pending';
      default: return 'cell-empty';
    }
  };

  const filteredStudents = data.students.filter(s => 
    s.last_name.toLowerCase().includes(filterName.toLowerCase())
  );

  return (
    <div className="dashboard">
      <LoaderOverlay visible={loading} text="Загружаем данные..." />
      <Navigation user={user} onLogout={onLogout} />

      <section className="add-lab-section">
        <h2>Сводная таблица</h2>
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label>Фильтр по фамилии</label>
          <input
            type="text"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Введите фамилию..."
          />
        </div>
      </section>

      <section className="summary-section">
        {data.labs.length === 0 ? (
          <div className="empty-state">
            <p>Сначала добавьте лабораторные работы</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="empty-state">
            <p>Студенты не найдены</p>
          </div>
        ) : (
          <div className="summary-table-wrapper">
            <table className="summary-table">
              <thead>
                <tr>
                  <th className="sticky-col">Фамилия</th>
                  {data.labs.map(lab => (
                    <th key={lab.id} title={lab.name}>
                      {lab.name.length > 15 ? lab.name.substring(0, 15) + '...' : lab.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td className="sticky-col">{student.last_name}</td>
                    {data.labs.map(lab => {
                      const sub = getSubmission(student.id, lab.id);
                      return (
                        <td 
                          key={lab.id} 
                          className={getCellClass(sub?.status)}
                          title={sub?.mr_link}
                        >
                          {sub ? (
                            sub.status === 'approved' ? '✓' : 
                            sub.status === 'rejected' ? '✗' : '⏳'
                          ) : '—'}
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

export default TeacherSummary;

