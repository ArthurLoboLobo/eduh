import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="font-label text-[13px] text-page-cream-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-[14px] py-[12px] rounded-[6px] font-body text-[15px]
            bg-desk-surface text-page-cream
            border border-hairline
            placeholder:text-page-cream-faint
            focus:outline-none focus:input-focus-glow
            transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'ring-[3px] ring-rust-danger/25' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[13px] font-label text-rust-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
