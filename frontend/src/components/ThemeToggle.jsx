import React from 'react';

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Переключить тему на ${theme === 'dark' ? 'светлую' : 'тёмную'}`}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}

export default ThemeToggle;

