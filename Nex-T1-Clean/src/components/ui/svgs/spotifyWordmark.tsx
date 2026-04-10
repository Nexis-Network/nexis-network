import * as React from 'react'

export const SpotifyWordmark = (
  props: React.SVGProps<SVGSVGElement>,
) => (
  <svg
    viewBox="0 0 150 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="18" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 15c4-2.5 8-2.5 12 0M13 18c3-1.8 6-1.8 9 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <text
      x="55"
      y="21"
      fontFamily="var(--font-sans, 'Inter', sans-serif)"
      fontSize="16"
      fontWeight="600"
      fill="currentColor"
    >
      Spotify
    </text>
  </svg>
)
