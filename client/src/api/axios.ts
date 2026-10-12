import axios from "axios";

// Same server address as the main API (set per shop with VITE_API_URL)
import { API_URL } from "./apiUrl";

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        "Content-Type": "application/json",
    },
});
