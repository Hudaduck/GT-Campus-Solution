import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

// ThirdPlace logo mark (same artwork as public/buzz-icon.svg): navy tile, gold radar pin
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    role="img"
    aria-label="ThirdPlace"
    className={`shrink-0 ${className}`}
  >
    <rect width="512" height="512" rx="112" fill="#051E39" />
    <circle cx="256" cy="232" r="132" fill="none" stroke="#8F713D" strokeWidth="16" opacity="0.7" />
    <circle cx="256" cy="232" r="76" fill="none" stroke="#8F713D" strokeWidth="16" />
    <path
      d="M256 104c-70 0-124 52-124 120 0 86 124 196 124 196s124-110 124-196c0-68-54-120-124-120z"
      fill="#B39051"
    />
    <circle cx="256" cy="224" r="44" fill="#051E39" />
  </svg>
);
