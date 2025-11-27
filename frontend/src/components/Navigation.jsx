import React from 'react';
import { NavLink } from 'react-router-dom';

function Navigation({ user, onLogout }) {
  const isTeacher = user.role === 'teacher';

  return (
    <header className="dashboard-header">
      <nav className="nav-tabs">
        {isTeacher ? (
          <>
            <NavLink to="/teacher" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
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
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Сдать работу
            </NavLink>
            <NavLink to="/my-labs" className={({ isActive }) => isActive ? 'nav-tab active' : 'nav-tab'}>
              Мои работы
            </NavLink>
          </>
        )}
      </nav>
      <div className="user-info">
        <span className="user-name">{user.lastName}</span>
        <button onClick={onLogout} className="btn-logout">Выйти</button>
      </div>
    </header>
  );
}

export default Navigation;

