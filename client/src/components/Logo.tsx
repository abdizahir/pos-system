// client/src/components/Logo.tsx

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GT POS"
    >
      <defs>
        <linearGradient
          id="logoGrad"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFB566" />
          <stop offset="1" stopColor="#FE9F43" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />

      {/* Acacia canopy — flat top, spreading */}
      <ellipse cx="24" cy="18" rx="15" ry="5" fill="white" fillOpacity="0.95" />
      <ellipse cx="16.5" cy="16.5" rx="9" ry="3.5" fill="white" fillOpacity="0.95" />
      <ellipse cx="31.5" cy="16.5" rx="9" ry="3.5" fill="white" fillOpacity="0.95" />

      {/* Trunk */}
      <path
        d="M22.75 21 L22.75 36 Q22.75 37.5 24 37.5 Q25.25 37.5 25.25 36 L25.25 21 Z"
        fill="white"
        fillOpacity="0.95"
      />

      {/* Branches */}
      <path
        d="M23.5 22.5 C21 23.5 18.5 24.5 16 25.5"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M24.5 22.5 C27 23.5 29.5 24.5 32 25.5"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}