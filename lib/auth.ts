export type Role = "admin" | "sales" | "azubi";

export const canWrite = (role: Role | null | undefined) => role === "admin" || role === "sales";
export const isAdmin = (role: Role | null | undefined) => role === "admin";
