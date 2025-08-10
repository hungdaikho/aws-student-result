"use client";

import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number; // The moyenne value (0-20)
  maxValue?: number; // Maximum possible value (default 20)
  size?: number; // Size of the circle
  strokeWidth?: number; // Width of the progress stroke
  className?: string;
  showValue?: boolean;
  label?: string;
}

export function CircularProgress({
  value,
  maxValue = 20,
  size = 200,
  strokeWidth = 10, // Made thinner
  className = "",
  showValue = true,
  label = "",
}: CircularProgressProps) {
  const [progress, setProgress] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = (value / maxValue) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determine colors based on percentage and admis status
  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "#EF4444"; // Red for failed
    if (percentage >= 80) return "#10B981"; // Green for excellent
    if (percentage >= 60) return "#3B82F6"; // Blue for good
    return "#F59E0B"; // Orange for average
  };

  const progressColor = getProgressColor(percentage);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage);
    }, 100);

    // Animate the displayed value
    const valueTimer = setInterval(() => {
      setDisplayValue((prev) => {
        const increment = value / 50; // Animate over ~1 second (50 * 20ms)
        const next = prev + increment;
        if (next >= value) {
          clearInterval(valueTimer);
          return value;
        }
        return next;
      });
    }, 20);

    return () => {
      clearTimeout(timer);
      clearInterval(valueTimer);
    };
  }, [value, percentage]);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.15))" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out drop-shadow-lg"
          style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.1))" }}
        />
        {/* Inner glow effect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth / 2}
          stroke={progressColor}
          strokeWidth={2}
          fill="transparent"
          className="opacity-20"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <>
            <span 
              className="text-4xl font-black tracking-tight" 
              style={{ color: progressColor }}
            >
              {displayValue ? displayValue.toFixed(2) : "0.00"}
            </span>
            <span 
              className="text-sm font-medium mt-1 opacity-70"
              style={{ color: progressColor }}
            >
              /{maxValue}
            </span>
            {/* Removed label display from inside the circle */}
          </>
        )}
      </div>
    </div>
  );
}
