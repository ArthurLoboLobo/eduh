'use client';

import { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export default function Checkbox({ label, className = '', id, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        className="
          appearance-none w-5 h-5 rounded-[4px]
          border border-hairline bg-lamp-night transition-all duration-200 ease-out
          checked:bg-oxblood checked:border-oxblood focus:ring-2 focus:ring-oxblood-tint focus:border-oxblood
          focus:outline-none cursor-pointer active:scale-90
          hover:border-page-cream-faint hover:bg-desk-surface
          flex items-center justify-center
          before:content-[''] before:w-full before:h-full before:scale-0 before:bg-[url('data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%208L6%2011L13%204%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] before:transition-transform before:duration-200 checked:before:scale-100
        "
        {...props}
      />
      {label && <span className="font-body text-[14px] text-page-cream">{label}</span>}
    </label>
  );
}
