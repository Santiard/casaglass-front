import { useState } from 'react';

/**
 * Hook personalizado para manejar formularios con conversión automática a mayúsculas
 * @param {Object} initialState - Estado inicial del formulario
 * @param {Array} numericFields - Array de nombres de campos que solo permiten números
 * @param {Array} uppercaseFields - Array de nombres de campos que se convierten a mayúsculas (por defecto todos los de texto)
 * @param {Object} validationRules - Reglas de validación para campos específicos
 * @returns {Object} - { formData, handleChange, resetForm, setFormData }
 */
export const useUppercaseForm = (
  initialState = {}, 
  numericFields = [], 
  uppercaseFields = null,
  validationRules = {}
) => {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Si el campo está en numericFields, aplicar validación numérica
    if (numericFields.includes(name)) {
      const rule = validationRules[name];
      if (rule && rule.regex) {
        if (!rule.regex.test(value)) {
          return; // No actualizar si no cumple la validación
        }
      }
      // No convertir a mayúsculas los campos numéricos
      processedValue = value;
    } 
    // Si uppercaseFields es null, aplicar a todos los campos de texto (que no sean numéricos)
    // Si uppercaseFields es array, aplicar solo a esos campos
    else if (
      (uppercaseFields === null && !numericFields.includes(name)) ||
      (Array.isArray(uppercaseFields) && uppercaseFields.includes(name))
    ) {
      processedValue = value.toUpperCase();
    }

    setFormData(prevData => ({
      ...prevData,
      [name]: processedValue,
    }));
  };

  const resetForm = () => {
    setFormData(initialState);
  };

  return {
    formData,
    handleChange,
    resetForm,
    setFormData
  };
};

/**
 * Función helper para generar estilos de input según el tipo de campo
 * @param {string} fieldName - Nombre del campo
 * @param {Array} numericFields - Array de campos numéricos
 * @param {Array} uppercaseFields - Array de campos de mayúsculas
 * @returns {Object} - Objeto de estilos para el input
 */
export const getInputStyles = (fieldName, numericFields = [], uppercaseFields = null) => {
  // Si es campo numérico, no aplicar textTransform
  if (numericFields.includes(fieldName)) {
    return {};
  }
  
  // Si uppercaseFields es null (aplicar a todos) o el campo está en la lista
  if (
    uppercaseFields === null || 
    (Array.isArray(uppercaseFields) && uppercaseFields.includes(fieldName))
  ) {
    return { textTransform: 'uppercase' };
  }
  
  return {};
};

/**
 * Constantes para validaciones comunes
 */
export const VALIDATION_PATTERNS = {
  NIT_9_DIGITS: /^\d{0,9}$/,
  NIT_10_DIGITS: /^\d{0,10}$/,
  PHONE_10_DIGITS: /^\d{0,10}$/,
  PHONE_12_DIGITS: /^\d{0,12}$/,
  ONLY_NUMBERS: /^\d*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]*$/,
  TEXT_ONLY: /^[a-zA-ZÀ-ÿ\s]*$/
};

export default useUppercaseForm;