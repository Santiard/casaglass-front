import { api } from "../lib/api";

// POST /api/auth/login  -> { username, password }
export async function login({ username, password }) {
  const { data } = await api.post("/auth/login", { username, password });
  // data = { id, nombre, correo, username, rol, sedeId, sedeNombre }
  return data;
}

export function saveSession(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getSession() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("user");
}
