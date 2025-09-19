import { useState } from "react";

export default function NumberInput({ min = 0, max = 100, step = 1, initial = 0 }) {
  const [value, setValue] = useState(initial);

  const handleChange = (e) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      setValue(val);
    }
  };



  return (
    <div className="flex items-center border rounded-md overflow-hidden w-fit">
      {/* Input numérico */}
      <input
        type="number"
        value={value}
        onChange={handleChange}
        className="w-16 text-center outline-none"
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
