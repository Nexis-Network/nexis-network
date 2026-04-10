import * as React from 'react'

export const SupabaseWordmarkDark = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    viewBox="0 0 150 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M20 6 8 20h10v10l12-14H20V6Z" fill="currentColor" opacity="0.4" />
    <text
      x="60"
      y="21"
      fontFamily="var(--font-sans, 'Inter', sans-serif)"
      fontSize="16"
      fontWeight="600"
      fill="currentColor"
    >
      Supabase
    </text>
  </svg>
)
