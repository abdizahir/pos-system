// client/src/components/Footer.tsx

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E6EAED] px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#A6AAAF]">
          © {year} GT POS. All rights reserved.
        </p>

        <p className="text-sm text-[#A6AAAF]">
          Designed &amp; Developed By{" "}
          <span className="text-[#646B72] font-medium">
            Galool Tech
          </span>
        </p>
      </div>
    </footer>
  );
}