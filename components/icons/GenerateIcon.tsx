import React from 'react';

const GenerateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M12 2a10 10 0 1 0 10 10" />
    <path d="M22 12a10 10 0 0 0-10-10" />
    <path d="m10 7 2 2 2-2" />
    <path d="m10 15 2-2 2 2" />
    <path d="m7 10 2 2-2 2" />
    <path d="m17 10-2 2 2 2" />
  </svg>
);

export default GenerateIcon;