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
          <label htmlFor={id} className="text-sm font-medium text-primary-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full px-4 py-3 rounded-2xl text-sm
            bg-surface text-primary-text
            border border-border-subtle
            placeholder:text-muted-text
            focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
            transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger-red focus:border-danger-red focus:ring-danger-red/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-danger-red">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
