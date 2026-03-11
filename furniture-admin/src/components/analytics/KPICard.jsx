// components/analytics/KPICard.jsx
import { Card, CardContent } from "../ui/Card";
import clsx from "clsx";

export default function KPICard({
    title,
    value,
    sub,
    icon,
    gradientClass = "", // e.g., 'bg-gradient-to-br from-lector-pink to-lector-purple'
    colorClass = "text-primary-600 bg-primary-100/50",
    clickable = false,
    onClick,
}) {
    const isClickable = clickable && typeof onClick === "function";
    const isGradient = !!gradientClass;

    return (
        <Card
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : -1}
            onClick={isClickable ? onClick : undefined}
            onKeyDown={
                isClickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            onClick();
                        }
                    }
                    : undefined
            }
            className={clsx(
                "transition-all duration-300 relative overflow-hidden border-0 shadow-soft",
                gradientClass ? gradientClass : "bg-white",
                isClickable && !gradientClass ? "cursor-pointer hover:shadow-card hover:-translate-y-1" : "",
                isClickable && gradientClass ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 brightness-105" : ""
            )}
        >
            {/* Soft inner glow / shine for gradient cards */}
            {isGradient && (
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            )}

            <CardContent className="p-6 flex justify-between items-center sm:items-start h-full relative z-10">
                <div className="space-y-1.5 flex-1">
                    <p className={clsx("text-sm font-semibold uppercase tracking-wider", isGradient ? "text-white/90" : "text-slate-500")}>
                        {title}
                    </p>
                    <p className={clsx("text-3xl font-bold tracking-tight", isGradient ? "text-white" : "text-slate-800")}>
                        {value}
                    </p>
                    {sub && (
                        <p className={clsx("text-xs font-medium mt-1", isGradient ? "text-white/80" : "text-slate-400")}>
                            {sub}
                        </p>
                    )}
                </div>

                <div className={clsx("p-3.5 rounded-xl shadow-sm backdrop-blur-sm", isGradient ? "bg-white/20 text-white" : colorClass)}>
                    {icon}
                </div>
            </CardContent>
        </Card>
    );
}
