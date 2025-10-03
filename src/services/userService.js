export async function updatePassword({ current, next }){
// Validaciones rápidas en cliente (la API debe validar de nuevo)
if (!next || next.length < 8) {
throw new Error("La nueva contraseña debe tener al menos 8 caracteres");
}
// Simular latencia y reglas de ejemplo
await new Promise(r => setTimeout(r, 600));
if (current === next) {
throw new Error("La nueva contraseña no puede ser igual a la actual");
}
// Simula error si la actual es incorrecta
if (current !== "demo1234!") {
// En producción, la API devolvería 401/422 con mensaje
throw new Error("La contraseña actual es incorrecta");
}
return { ok: true, message: "Contraseña actualizada correctamente" };
}