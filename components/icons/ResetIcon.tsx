import React from 'react';

const ResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M21.24 12.33 22 7l-5 1.76" />
    <path d="M16 17.78a9 9 0 1 1 1.76-7.78" />
  </svg>
);

export default ResetIcon;
