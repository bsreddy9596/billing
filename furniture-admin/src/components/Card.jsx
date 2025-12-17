export default function Card({ title, value, color = "#00BFA6", icon }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-5 flex items-center justify-between border border-gray-100">
            <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide uppercase">
                    {title}
                </h3>
                <p
                    className="text-3xl font-bold"
                    style={{ color }}
                >
                    {value}
                </p>
            </div>

            {icon && (
                <div
                    className="p-3 rounded-full"
                    style={{
                        backgroundColor: `${color}15`, // subtle tint
                        color,
                    }}
                >
                    {icon}
                </div>
            )}
        </div>
    );
}
