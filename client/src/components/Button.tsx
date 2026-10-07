interface ButtonProps {
  name: string;
    type?: "button" | "submit" | "reset";
  onClick: () => void;
}

export default function Button({name, onClick, type}: ButtonProps) {
  return (
    <button type={type} onClick={onClick} className="bg-[#FE9F43] text-white px-3 py-1.75 rounded-[5px] cursor-pointer flex items-center gap-2">
      <img
        src="/images/add-circle-icon.svg"
        alt="add-circle-icon"
        className="w-5 h-5"
      />
      <span>{name}</span>
    </button>
  );
}
