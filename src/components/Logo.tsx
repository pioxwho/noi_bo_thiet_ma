// Logo PIO ở góc trên bên trái
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="PIO">
      <circle cx="32" cy="32" r="29" fill="#6b1230" stroke="#facc15" strokeWidth="4" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#facc15" strokeWidth="1" strokeDasharray="2 3" />
      <text
        x="32"
        y="39"
        textAnchor="middle"
        fontSize="19"
        fontWeight="900"
        fill="#ffffff"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        PIO
      </text>
    </svg>
  );
}
