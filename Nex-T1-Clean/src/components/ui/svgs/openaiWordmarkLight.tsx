import * as React from 'react'

export const OpenaiWordmarkLight = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    viewBox="0 0 160 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="20" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M18 11h4v10h-4z" fill="currentColor" />
    <text
      x="55"
      y="21"
      fontFamily="var(--font-sans, 'Inter', sans-serif)"
      fontSize="16"
      fontWeight="600"
      fill="currentColor"
    >
      OpenAI
    </text>
  </svg>
)
