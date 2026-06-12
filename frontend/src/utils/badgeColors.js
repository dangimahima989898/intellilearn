export const subjectColors = {
  DSA:    { bg: '#EEEDFE', text: '#3C3489' },
  DBMS:   { bg: '#E6F1FB', text: '#0C447C' },
  OS:     { bg: '#FAECE7', text: '#712B13' },
  CN:     { bg: '#FAEEDA', text: '#633806' },
  JAVA:   { bg: '#EAF3DE', text: '#27500A' },
  PYTHON: { bg: '#E1F5EE', text: '#085041' },
  OS101:  { bg: '#FAECE7', text: '#712B13' },
  SE102:  { bg: '#FBEAF0', text: '#72243E' },
  AMCA101:{ bg: '#EEEDFE', text: '#3C3489' },
  default:{ bg: '#F1EFE8', text: '#444441' },
};

export const subjectBadge = (code) => {
  const color = subjectColors[code?.toUpperCase()] || subjectColors.default;
  return { bg: color.bg, color: color.text };
};

export const statusBadge = (status) => {
  const map = {
    resolved:   { bg: '#EAF3DE', color: '#27500A' },
    unresolved: { bg: '#FCEBEB', color: '#791F1F' },
    active:     { bg: '#EAF3DE', color: '#27500A' },
    overdue:    { bg: '#FAEEDA', color: '#633806' },
    pending:    { bg: '#FAEEDA', color: '#633806' },
    inactive:   { bg: '#F1EFE8', color: '#5F5E5A' },
  };
  return map[status?.toLowerCase()] || { bg: '#F1EFE8', color: '#5F5E5A' };
};
