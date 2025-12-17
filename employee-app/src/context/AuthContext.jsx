// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("employeeUser");
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const login = (data) => {
        setUser(data);
        localStorage.setItem("employeeUser", JSON.stringify(data));
        localStorage.setItem("employeeToken", data.token);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("employeeUser");
        localStorage.removeItem("employeeToken");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
