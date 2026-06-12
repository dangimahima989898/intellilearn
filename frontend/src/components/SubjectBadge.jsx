import React from 'react';
import { subjectBadge } from '../utils/badgeColors';

export default function SubjectBadge({ code, name, className, style }) {
  // If code is not provided but name is, extract the code from the name
  let subjectCode = code;
  if (!subjectCode && name) {
    subjectCode = String(name).split(' ')[0]?.toUpperCase();
  }
  
  const color = subjectBadge(subjectCode);
  
  return (
    <span 
      className={className}
      style={{
        background: color.bg,
        color: color.color,
        fontSize: '11px',
        fontWeight: 550,
        padding: '3px 10px',
        borderRadius: '20px',
        display: 'inline-block',
        border: `1px solid ${color.color}20`,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {name || subjectCode}
    </span>
  );
}
