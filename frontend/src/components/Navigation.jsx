import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

function Navigation({ user, onLogout }) {
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
              Лабораторные
            </NavLink>
            <NavLink to="/teacher/summary" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сводная таблица
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
          </>
        )}
        </nav>
      </div>
      <div className="user-info">
        <span className="user-name" title={user.lastName}>{user.lastName}</span>
        <button onClick={onLogout} className="btn-logout">Выйти</button>
      </div>
    </header>
  );
}

export default Navigation;

