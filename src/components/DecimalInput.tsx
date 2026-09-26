import React from 'react';

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string | number) => void;
}

export function DecimalInput({ value, onChange, ...props }: DecimalInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    if (val === '') {
      onChange('');
      return;
    }
    
    // Replace comma with dot for European locales
    val = val.replace(',', '.');
    
    // Valid format: numbers, optional dot, up to 3 decimal places, no negatives
    if (/^\d*\.?\d{0,3}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}
