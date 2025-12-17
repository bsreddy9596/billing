// src/layout/MainLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F6F9FC]">

            {/* NAVBAR */}
            <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex pt-[64px]">

                {/* SIDEBAR */}
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

                {/* MAIN CONTENT */}
                <main
                    className="
                        flex-1
                        p-4 sm:p-6
                        transition-all duration-300
                        lg:pl-64
                    "
                >
                    <Outlet />
                </main>

            </div>
        </div>
    );
}
