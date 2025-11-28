import React from 'react';

function LoaderOverlay({ visible, text = 'Загрузка...' }) {
  if (!visible) return null;

  return (
    <div className="loader-overlay">
      <div className="loader-spinner" />
      <p>{text}</p>
    </div>
  );
}

export default LoaderOverlay;

