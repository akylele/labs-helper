import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

function Navigation({ user, onLogout, theme, onToggleTheme }) {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isTeacher = user.role === 'teacher';

  const toggleMenu = () => setMobileMenuOpen(prev => !prev);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="nav-toggle" onClick={toggleMenu}>
          ☰
        </button>
        <nav className={`nav-tabs ${isMobileMenuOpen ? 'open' : ''}`}>
        {isTeacher ? (
          <>
            <NavLink end to="/teacher" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Работы
            </NavLink>
            <NavLink to="/teacher/labs" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Список Работ
            </NavLink>
            <NavLink to="/teacher/summary" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сводная таблица
            </NavLink>
            <NavLink to="/teacher/attendance" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Посещаемость
            </NavLink>
            <NavLink to="/teacher/attendance-summary" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сводка посещаемости
            </NavLink>
            <NavLink to="/teacher/grades-lessons" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Оценки занятий
            </NavLink>
            <NavLink to="/teacher/grades-exams" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Контрольные
            </NavLink>
            <NavLink to="/teacher/grades-lessons-summary" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сводка оценок занятий
            </NavLink>
            <NavLink to="/teacher/grades-exams-summary" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сводка контрольных
            </NavLink>
          </>
        ) : (
          <>
            <NavLink end to="/dashboard" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сдать работу
            </NavLink>
            <NavLink to="/my-labs" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Мои работы
            </NavLink>
            <NavLink to="/attendance" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Посещаемость
            </NavLink>
            <NavLink to="/grades-lessons" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Оценки занятий
            </NavLink>
            <NavLink to="/grades-exams" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Оценки контрольные
            </NavLink>
          </>
        )}
        </nav>
      </div>
      <div className="user-info">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <span className="user-name" title={user.fullName || user.lastName}>{user.fullName || user.lastName}</span>
        <button onClick={onLogout} className="btn-logout">Выйти</button>
      </div>
    </header>
  );
}

export default Navigation;

