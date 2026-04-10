import * as React from 'react'

export const VercelWordmark = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    viewBox="0 0 140 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 8 2 24h20L12 8Z" fill="currentColor" />
    <text
      x="55"
      y="21"
      fontFamily="var(--font-sans, 'Inter', sans-serif)"
      fontSize="16"
      fontWeight="600"
      fill="currentColor"
    >
      Vercel
    </text>
  </svg>
)
