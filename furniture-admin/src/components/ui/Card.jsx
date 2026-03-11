import React from 'react';
import clsx from 'clsx';

export function Card({ className, children, ...props }) {
    return (
        <div className={clsx("bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300", className)} {...props}>
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }) {
    return (
        <div className={clsx("px-6 py-5 border-b border-slate-100", className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...props }) {
    return (
        <h3 className={clsx("text-lg font-bold tracking-tight text-slate-800", className)} {...props}>
            {children}
        </h3>
    );
}

export function CardContent({ className, children, ...props }) {
    return (
        <div className={clsx("p-6", className)} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ className, children, ...props }) {
    return (
        <div className={clsx("px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center mt-auto", className)} {...props}>
            {children}
        </div>
    );
}
