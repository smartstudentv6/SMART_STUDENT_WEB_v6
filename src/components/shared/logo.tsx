
import type React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  // any additional props if needed
}

const Logo: React.FC<LogoProps> = (props) => {
  return (
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
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.084a1 1 0 0 0 0 1.838l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5L2 14v4c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2v-4l-4-1.5" />
    </svg>
  );
};

export default Logo;
