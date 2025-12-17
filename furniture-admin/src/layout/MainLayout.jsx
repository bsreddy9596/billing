import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "./Navbar";

export default function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 🔹 Navbar */}
            <div className="fixed top-0 left-0 right-0 z-40">
                <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            </div>

            {/* 🔹 Main Wrapper */}
            <div className="flex flex-1 pt-[64px]">
                {/* Sidebar */}
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

                {/* 🔹 Main Content Area */}
                <main className="flex-1 bg-gray-50 p-6 overflow-y-auto transition-all duration-300 ease-in-out lg:ml-64">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
}
