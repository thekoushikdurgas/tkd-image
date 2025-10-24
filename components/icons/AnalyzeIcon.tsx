import React from 'react';

const AnalyzeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10.4 2.2a2.3 2.3 0 0 1 3.2 0l7.2 7.2a2.4 2.4 0 0 1 0 3.2l-7.2 7.2a2.3 2.3 0 0 1-3.2 0l-7.2-7.2a2.4 2.4 0 0 1 0-3.2Z" />
    <path d="m14 10-2.5 2.5a1.5 1.5 0 0 0 0 2.1l.5.5" />
    <path d="m10 14 2.5-2.5a1.5 1.5 0 0 1 2.1 0l.5.5" />
  </svg>
);

export default AnalyzeIcon;