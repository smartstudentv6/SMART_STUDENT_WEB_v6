
import type React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", width = 24, height = 24 }) => {
  return (
    <Image
      src="/favicon.ico"
      alt="SMART STUDENT Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
};

export default Logo;
