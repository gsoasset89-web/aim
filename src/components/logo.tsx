import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export default function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12.0002 2.66699L3.3335 7.33366V16.667L12.0002 21.3337L20.6668 16.667V7.33366L12.0002 2.66699Z"
        className="stroke-primary fill-primary/20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12.5L10 10.5L12 12.5L14 10.5L16 12.5"
        className="stroke-primary"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
