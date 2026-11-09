const DEFAULT_API_URL = "http://localhost:3001";

// Set VITE_API_URL in a .env file to point at another backend (see .env.example).
const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL = (envApiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
