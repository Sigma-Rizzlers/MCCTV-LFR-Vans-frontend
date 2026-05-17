export const DATA_MODE = import.meta.env.VITE_DATA_MODE ?? "local";
export const isLocal = () => DATA_MODE === "local";
export const isApi = () => DATA_MODE === "api";
export const isDual = () => DATA_MODE === "dual";
