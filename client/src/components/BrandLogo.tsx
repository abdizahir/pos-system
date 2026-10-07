// client/src/components/BrandLogo.tsx

import Logo from "./Logo";

type BrandLogoProps = {
  size?: number;
  showText?: boolean;
};

export default function BrandLogo({
  size = 40,
  showText = true,
}: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-[#212529] text-left">
            Galool Tech
          </span>
          <span className="text-lg font-bold text-[#212529] text-left">
            
          </span>
        </div>
      )}
    </div>
  );
}