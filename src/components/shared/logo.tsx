
import type React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  // any additional props if needed
}

const Logo: React.FC<LogoProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24" // Default width, can be overridden by props
      height="24" // Default height, can be overridden by props
      viewBox="0 0 24 24" // Standardized viewBox
      fill="none"
      stroke="currentColor" // Ensures it inherits text color
      strokeWidth="2" // Standardized strokeWidth
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props} // Allows overriding default width, height, className, etc.
    >
      {/* SVG paths for the minimalist graduation cap from the image */}
      <path d="M2 9 L12 7 L22 9 L12 11 L2 9 Z" /> {/* Top mortarboard part */}
      <path d="M7 11 L17 11 L17 15 L7 15 L7 11 Z" /> {/* Base hat part */}
      <path d="M22 9 L22 12" /> {/* Tassel element */}
    </svg>
  );
};

export default Logo;
