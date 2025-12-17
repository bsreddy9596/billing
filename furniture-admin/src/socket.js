import { io } from "socket.io-client";

// ⚡ Backend server URL (.env or default localhost)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

// Log socket events (optional for debugging)
socket.on("connect", () => {
  console.log("🟢 Connected to socket:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from socket");
});

export default socket;
