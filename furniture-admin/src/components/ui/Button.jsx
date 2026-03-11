import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    icon: Icon,
    type = 'button',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-[0.98]';

    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md focus:ring-primary-500 shadow-sm border border-transparent',
        secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-primary-500 shadow-sm',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-md focus:ring-rose-500 shadow-sm border border-transparent',
        ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-500',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            type={type}
            className={clsx(baseStyles, variants[variant], sizes[size], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : Icon ? (
                <Icon className={clsx("w-4 h-4", children ? "mr-2" : "")} />
            ) : null}
            {children}
        </button>
    );
}
