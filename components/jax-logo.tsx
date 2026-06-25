export function JaxLogo({ size = 28, color = '#0058bc' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 31 50 A 31 14 -45 0 0 69 50" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <ellipse cx="50" cy="50" rx="31" ry="14" stroke={color} strokeWidth="7" transform="rotate(45 50 50)"/>
      <path d="M 69 50 A 31 14 -45 0 0 31 50" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"/>
    </svg>
  )
}
