
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
      viewBox="0 0 24 24" // Standardized viewBox for the new icon
      fill="none"
      stroke="currentColor" // Ensures it inherits text color
      strokeWidth="2" // Standardized strokeWidth for the new icon
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props} // Allows overriding default width, height, className, etc.
    >
      {/* SVG paths for a graduation cap (Lucide GraduationCap icon) */}
      <path d="M21.42 10.72L12 15.9L2.58 10.72L12 5.5Z"/>
      <path d="M12 15.9V22L19 18.5"/>
      <path d="M22 10.5V6C22 5.20435 21.6839 4.44129 21.1213 3.87868C20.5587 3.31607 19.7956 3 19 3H5C4.20435 3 3.44129 3.31607 2.87868 3.87868C2.31607 4.44129 2 5.20435 2 6V10.5"/>
    </svg>
  );
};

export default Logo;
