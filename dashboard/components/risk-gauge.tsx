"use client";

import { getGrade, getGradeColor, type Grade } from "@/lib/scoring";

interface RiskGaugeProps {
  score: number;
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const grade = getGrade(score);
  const color = getGradeColor(grade);

  // SVG arc calculation
  const radius = 45;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc */}
        <path
          d="M 10 65 A 45 45 0 0 1 110 65"
          fill="none"
          stroke="#1e293b"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 65 A 45 45 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
        {/* Score text */}
        <text
          x="60"
          y="52"
          textAnchor="middle"
          fill={color}
          fontSize="22"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {score}
        </text>
        {/* Grade letter */}
        <text
          x="60"
          y="67"
          textAnchor="middle"
          fill={color}
          fontSize="12"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          Grade {grade}
        </text>
      </svg>
    </div>
  );
}
