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
