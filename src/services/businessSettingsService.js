const KEY = 'business_settings_v1';


export async function getBusinessSettings(){
const raw = localStorage.getItem(KEY);
if (!raw) return { ivaRate: 19, retefuenteRate: 2.5, retefuenteThreshold: 1000000 };
try { return JSON.parse(raw); } catch { return { ivaRate: 19, retefuenteRate: 2.5, retefuenteThreshold: 1000000 }; }
}


export async function updateBusinessSettings(payload){
// Validación mínima; valida duro en el backend también
const { ivaRate, retefuenteRate, retefuenteThreshold } = payload || {};
if (ivaRate<0 || ivaRate>100) throw new Error('IVA inválido');
if (retefuenteRate<0 || retefuenteRate>100) throw new Error('Retención inválida');
if (retefuenteThreshold<0) throw new Error('Umbral inválido');
localStorage.setItem(KEY, JSON.stringify(payload));
return { ok: true };
}