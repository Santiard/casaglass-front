import React, { useState, useMemo } from 'react';
import CategorySidebar from '../componets/CategorySidebar.jsx';
import '../styles/UnirCortesModal.css';
import '../styles/InventaryFilters.css';

export default function UnirCortesModal({ isOpen, onClose, cortes = [], categories = [], onConfirm, isAdmin, sedeId }){
  const [selectedCategory, setSelectedCategory] = useState(categories?.[0]?.id || null);
  const [search, setSearch] = useState('');
  const [color, setColor] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    // Mostrar SOLO cortes que tengan stock > 0 en la sede del usuario
    return (cortes || []).filter(c => {
      // filtrar por categoría si está seleccionada
      if (selectedCategory) {
        const selected = categories.find(cat => cat.id === selectedCategory);
        if (selected && (c.categoria || '').toLowerCase() !== selected.nombre.toLowerCase()) return false;
      }
      // filtrar por color
      if (color && (c.color || '').toUpperCase() !== color.toUpperCase()) return false;
      // filtrar por texto
      if (search) {
        const q = search.toLowerCase();
        if (!((c.nombre||'').toLowerCase().includes(q) || (c.codigo||'').toLowerCase().includes(q) || (c.observacion||'').toLowerCase().includes(q))) return false;
      }
      // OBLIGATORIO: ocultar cortes sin stock en la sede del usuario (la sede siempre está definida)
      const qtySede = sedeId === 1 ? Number(c.cantidadInsula || 0) : sedeId === 2 ? Number(c.cantidadCentro || 0) : sedeId === 3 ? Number(c.cantidadPatios || 0) : 0;
      if (qtySede <= 0) return false;

      return true;
    });
  }, [cortes, selectedCategory, search, color, categories, sedeId]);

  const toggleSelect = (id) => {
    setSelectedIds(curr => {
      if (curr.includes(id)) return curr.filter(x=>x!==id);
      if (curr.length >= 2) return curr; // only allow two
      return [...curr, id];
    });
  };

  const selectedCortes = (selectedIds || []).map(id => cortes.find(c=>c.id===id)).filter(Boolean);

  const getCantidadEnSede = (corte, sedeId) => {
    if (!corte) return 0;
    if (sedeId === 1) return Number(corte.cantidadInsula || 0);
    if (sedeId === 2) return Number(corte.cantidadCentro || 0);
    if (sedeId === 3) return Number(corte.cantidadPatios || 0);
    // fallback to cantidadTotal
    return Number(corte.cantidadTotal || corte.cantidad || 0);
  };

  const mergeValidation = () => {
    if (selectedCortes.length !== 2) return { valid: false, reason: 'Selecciona exactamente dos cortes.' };
    const [a,b] = selectedCortes;
    const sameProducto = (a.productoId || a.productoOriginal || a.producto) === (b.productoId || b.productoOriginal || b.producto);
    if (!sameProducto) return { valid: false, reason: 'Los cortes deben ser del mismo producto.' };
    const sameColor = (a.color || '').toUpperCase() === (b.color || '').toUpperCase();
    if (!sameColor) return { valid: false, reason: 'Los cortes deben tener el mismo color.' };
    const sameCategoria = (a.categoria || '').toLowerCase() === (b.categoria || '').toLowerCase();
    if (!sameCategoria) return { valid: false, reason: 'Los cortes deben pertenecer a la misma categoría.' };
    // cantidades en la sede del usuario
    const qtyA = getCantidadEnSede(a, sedeId);
    const qtyB = getCantidadEnSede(b, sedeId);
    if (qtyA < 1 || qtyB < 1) return { valid: false, reason: 'Ambos cortes deben tener al menos 1 unidad en tu sede.' };
    // la suma de largos no debe superar 600cm
    const suma = Number(a.largoCm || 0) + Number(b.largoCm || 0);
    if (suma > 600) return { valid: false, reason: `La suma de largos no debe superar 600 cm (actual: ${suma} cm).` };
    return { valid: true, reason: null };
  };

  const handleConfirm = () => {
    const { valid } = mergeValidation();
    if (!valid) return;
    const payload = {
      corteId1: selectedIds[0],
      corteId2: selectedIds[1],
      sedeId,
      corte1: selectedCortes[0],
      corte2: selectedCortes[1],
    };
    onConfirm && onConfirm(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="unir-modal-overlay">
      <div className="unir-modal">
        <header className="unir-modal-header">
          <h3>Unir cortes</h3>
          <button className="close" onClick={onClose}>×</button>
        </header>
        <div className="unir-modal-body">
          <aside className="unir-sidebar">
            <CategorySidebar
              categories={categories}
              selectedId={selectedCategory}
              onSelect={(id)=> setSelectedCategory(id)}
            />
          </aside>

          <section className="unir-list">
            <div className="unir-filters">
              <input className="filter-input" placeholder="Buscar..." value={search} onChange={(e)=>setSearch(e.target.value)} />
              <select className="filter-select" value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="">Todos los colores</option>
                <option value="MATE">MATE</option>
                <option value="BLANCO">BLANCO</option>
                <option value="NEGRO">NEGRO</option>
                <option value="BRONCE">BRONCE</option>
                <option value="NA">NA</option>
              </select>
            </div>

            <div className="unir-results">
              {filtered.length === 0 && <div className="empty">No hay cortes para mostrar</div>}
              {filtered.map(c => (
                <div key={c.id} className={`unir-item ${selectedIds.includes(c.id) ? 'selected' : ''}`} onClick={()=>toggleSelect(c.id)}>
                  <div className="unir-item-main">
                    <div className="unir-item-title">{c.nombre || c.codigo}</div>
                    <div className="unir-item-meta">{c.largoCm} cm • {c.color} • {c.categoria} • Sedes: Insula {c.cantidadInsula||0} / Centro {c.cantidadCentro||0} / Patios {c.cantidadPatios||0}</div>
                  </div>
                  <div className="unir-item-qty">{Number(c.cantidadTotal || c.cantidad || 0)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="unir-modal-footer">
          <div className="hint">
            Selecciona exactamente dos cortes del mismo producto, color y categoría. La suma de largos no debe superar 600 cm.
          </div>
          <div className="validation">
            {(() => {
              const mv = mergeValidation();
              if (!mv.valid && mv.reason) return <div className="error">{mv.reason}</div>;
              if (mv.valid) return <div className="ok">Validación OK — listo para unir.</div>;
              return null;
            })()}
          </div>
          <div className="actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={!mergeValidation().valid}>Unir cortes</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
