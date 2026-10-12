// client/src/components/BrandLogo.tsx

import Logo from "./Logo";
import { useShop } from "../features/shop/useShop";

type BrandLogoProps = {
  size?: number;
  showText?: boolean;
};

export default function BrandLogo({
  size = 40,
  showText = true,
}: BrandLogoProps) {
  const { name } = useShop();

  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-lg font-bold text-[#212529] text-left truncate" title={name}>
            {name}
          </span>
        </div>
      )}
    </div>
  );
}
