import React from 'react';
import clsx from 'clsx';

export default function Badge({
    children,
    variant = 'default',
    className = ''
}) {
    const variants = {
        default: 'bg-slate-500 text-white shadow-sm border-0 shadow-soft',
        primary: 'bg-lector-pink text-white shadow-sm border-0 shadow-soft',
        success: 'bg-emerald-500 text-white shadow-sm border-0 shadow-soft',
        warning: 'bg-lector-orange text-white shadow-sm border-0 shadow-soft',
        danger: 'bg-rose-500 text-white shadow-sm border-0 shadow-soft',
        info: 'bg-lector-blue text-white shadow-sm border-0 shadow-soft',
        purple: 'bg-lector-purple text-white shadow-sm border-0 shadow-soft'
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}
