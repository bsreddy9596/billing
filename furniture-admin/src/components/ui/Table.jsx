import React from 'react';
import clsx from 'clsx';

export function Table({ className, wrapperClassName, ...props }) {
    return (
        <div className={clsx("w-full overflow-auto", wrapperClassName)}>
            <table className={clsx("w-full caption-bottom text-sm", className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }) {
    return <thead className={clsx("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
    return (
        <tbody
            className={clsx("[&_tr:last-child]:border-0", className)}
            {...props}
        />
    );
}

export function TableFooter({ className, ...props }) {
    return (
        <tfoot
            className={clsx("border-t bg-slate-100/50 font-medium [&>tr]:last:border-b-0", className)}
            {...props}
        />
    );
}

export function TableRow({ className, ...props }) {
    return (
        <tr
            className={clsx(
                "border-b border-slate-100 transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-50",
                className
            )}
            {...props}
        />
    );
}

export function TableHead({ className, ...props }) {
    return (
        <th
            className={clsx(
                "h-12 px-4 text-left align-middle font-semibold text-white/90 text-[11px] uppercase tracking-wider bg-slate-800 border-none first:rounded-tl-lg last:rounded-tr-lg [&:has([role=checkbox])]:pr-0",
                className
            )}
            {...props}
        />
    );
}

export function TableCell({ className, ...props }) {
    return (
        <td
            className={clsx("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
            {...props}
        />
    );
}
