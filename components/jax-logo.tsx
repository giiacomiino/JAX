export function JaxLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#141922"/>
      {/* Back arc of E2 (lower-left outer) */}
      <path d="M 31 50 A 31 14 -45 0 0 69 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      {/* E1 full */}
      <ellipse cx="50" cy="50" rx="31" ry="14" stroke="white" strokeWidth="6" transform="rotate(45 50 50)"/>
      {/* Front arc of E2 (upper-right outer) on top of E1 */}
      <path d="M 69 50 A 31 14 -45 0 0 31 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  )
}
