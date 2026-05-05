import axios from "axios";

// Obtiene todos los créditos normales (excluye cliente especial)
export async function listarCreditos(params = {}) {
  // No pasar clienteId ni sedeId por defecto
  const response = await axios.get("/api/creditos", { params });
  return response.data;
}

// Obtiene solo los créditos del cliente especial (ID 499)
export async function listarCreditosClienteEspecial(params = {}) {
  // No pasar clienteId, el backend ya filtra por el especial
  const response = await axios.get("/api/creditos/cliente-especial", { params });
  return response.data;
}

// Obtiene créditos especiales de un mes específico con detalles de órdenes
// year: obligatorio (2000-2100)
// month: obligatorio (1-12)
// sedeId: opcional, filtra por sede
export async function obtenerOrdenesMesCierreEspecial(year, month, sedeId = null) {
  const params = { year, month };
  if (sedeId != null && Number.isFinite(sedeId)) {
    params.sedeId = sedeId;
  }
  const response = await axios.get("/api/creditos/cliente-especial/ordenes-mes", { params });
  return response.data;
}
