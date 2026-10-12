import axios from "axios";

// Same server address as the main API (set per shop with VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
});
