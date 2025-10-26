import React from 'react';

const ModelCreatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M5.52 19c.64-2.2 1.84-4 3.22-5.5s3.3-2.28 5.52-2.28" />
    <path d="M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    <path d="M21 21a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5" />
    <circle cx="18" cy="12" r="3"/>
  </svg>
);

export default ModelCreatorIcon;
