import React from 'react';

export const Toast = ({ message, isVisible }) => {
  return (
    <div className={`toast ${isVisible ? 'show' : ''}`}>
      <span dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  );
};