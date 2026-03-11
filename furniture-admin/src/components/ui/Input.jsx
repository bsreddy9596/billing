import React from 'react';
import clsx from 'clsx';

export const Input = React.forwardRef(({ className, type, error, ...props }, ref) => {
    return (
        <div className="w-full">
            <input
                type={type}
                className={clsx(
                    "flex h-11 w-full rounded-lg border bg-slate-50/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:bg-white hover:border-slate-300",
                    error
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-primary-500 focus:ring-primary-500/20",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
});

Input.displayName = "Input";

export const Label = React.forwardRef(({ className, children, ...props }, ref) => (
    <label
        ref={ref}
        className={clsx(
            "block text-sm font-medium leading-none text-slate-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5",
            className
        )}
        {...props}
    >
        {children}
    </label>
));

Label.displayName = "Label";
