import React from 'react';

interface ConfidenceGaugeProps {
  value: number;
}

const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ value }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle className="text-border-color" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
          <circle
            className="text-accent"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="60"
            cy="60"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-accent">{`${Math.round(value)}%`}</span>
          <span className="text-xs text-text-secondary">Confidence</span>
        </div>
      </div>
    );
  };

  export default ConfidenceGauge;
