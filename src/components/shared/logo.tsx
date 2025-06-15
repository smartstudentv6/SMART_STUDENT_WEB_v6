
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
      viewBox="0 0 22 19" // From the user's provided SVG
      fill="none"
      stroke="currentColor" // Ensures it inherits text color
      strokeWidth="1.5" // From the user's provided SVG
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props} // Allows overriding default width, height, className, etc.
    >
      <path d="M5 5.66667L10.8868 2L18.3193 5.27146C18.4188 5.31433 18.5042 5.38671 18.5679 5.48021C18.6317 5.57371 18.672 5.68548 18.6868 5.80779V11C18.6868 11.123 18.6651 11.2443 18.6198 11.3555C18.5745 11.4666 18.5067 11.5651 18.4222 11.6433L10.8868 18.1663L7.50779 16.6915C7.31243 16.5994 7.13049 16.4615 7.17893 16.351L7.97377 13.6112C8.01426 13.4908 8.09588 13.4038 8.19997 13.3545L10.8632 12.1093C11.2419 11.9537 11.2419 11.3796 10.8632 11.2241L3.31645 8.36919C3.21666 8.32298 3.13198 8.24998 3.06609 8.1574C3.00021 8.0649 3.00017 7.95572 3.06609 7.86318L4.80247 5.27146C4.85812 5.19072 4.93411 5.11892 5.0241 3.55787 5.0687 5.01113 5.09943 4.97503 5.14341V5.66667Z" />
      <path d="M18.6868 11L18.6868 13.5" />
    </svg>
  );
};

export default Logo;
