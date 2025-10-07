// src/componets/ViewSwitcher.jsx
import { useId } from "react";
import corte from "../assets/corte.png";
import producto from "../assets/producto.png";

const ProductIcon = ({ active }) => (
  <img
    src={producto}
    alt="Producto"
    className={`pill-icon ${active ? "active" : ""}`}
  />
);

const CutIcon = ({ active }) => (
  <img
    src={corte}
    alt="Corte"
    className={`pill-icon ${active ? "active" : ""}`}
  />
);

export default function ViewSwitcher({ value = "producto", onChange }) {
  const name = useId();

  const options = [
    { key: "producto", label: "Producto", Icon: ProductIcon },
    { key: "corte",    label: "Corte",    Icon: CutIcon },
  ];

  const activeIndex = options.findIndex(o => o.key === value);

  return (
    <div
      className="pill-switch"
      role="radiogroup"
      aria-label="Tipo de inventario"
    >
      {/* thumb deslizante */}
      <span
        className="pill-thumb"
        style={{
    transform: activeIndex === 0
      ? "translateX(0)"
      : "translateX(calc(100% + 0.5rem))" // mismo gap de 0.5rem
  }}
      />

      {options.map((opt, i) => {
        const checked = value === opt.key;
        const id = `${name}-${opt.key}`;
        return (
          <label
            key={opt.key}
            htmlFor={id}
            className={`pill-option ${checked ? "is-active" : ""}`}
            role="radio"
            aria-checked={checked}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange?.(opt.key);
              }
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const next = value === "producto" ? "corte" : "producto";
                onChange?.(next);
              }
            }}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.key}
              checked={checked}
              onChange={() => onChange?.(opt.key)}
              className="pill-input"
            />
            <opt.Icon active={checked} />
            <span className="pill-label">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
