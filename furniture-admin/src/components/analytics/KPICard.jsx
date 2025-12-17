// components/analytics/KPICard.jsx
export default function KPICard({
    title,
    value,
    sub,
    icon,
    color,
    clickable = false,
    onClick,
}) {
    const isClickable = clickable && typeof onClick === "function";

    return (
        <div
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
            className={`
        bg-gradient-to-br ${color}
        text-white p-5 rounded-2xl shadow-md
        transition-all duration-300
        ${isClickable
                    ? "cursor-pointer hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]"
                    : ""
                }
      `}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm opacity-90">{title}</p>
                    <p className="text-2xl font-bold leading-tight">{value}</p>
                    {sub && (
                        <p className="text-xs opacity-80 mt-1">
                            {sub}
                        </p>
                    )}
                </div>

                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur">
                    {icon}
                </div>
            </div>
        </div>
    );
}
