
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableCellProps {
  value: any;
  type?: 'text' | 'number' | 'switch' | 'select' | 'date';
  options?: { value: string; label: string }[];
  onSave: (value: any) => void;
  min?: number;
  max?: number;
  step?: string | number;
}

export const EditableCell = ({
  value,
  type = 'text',
  options,
  onSave,
  min,
  max,
  step
}: EditableCellProps) => {
  const [currentValue, setCurrentValue] = useState(value);

  const handleChange = (newValue: any) => {
    setCurrentValue(newValue);
    onSave(newValue);
  };

  if (type === 'switch') {
    return (
      <Switch
        checked={currentValue}
        onCheckedChange={handleChange}
      />
    );
  }

  if (type === 'select' && options) {
    return (
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Props additionnels pour le input number/date 
  const inputProps: Record<string, any> = {};
  if (type === 'number' || type === 'date') {
    if (min !== undefined) inputProps.min = min;
    if (max !== undefined) inputProps.max = max;
    if (step !== undefined) inputProps.step = step;
  }

  return (
    <Input
      type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
      value={currentValue || ''}
      onChange={(e) => {
        const newValue = type === 'number'
          ? (e.target.value ? parseFloat(e.target.value) : '')
          : e.target.value;
        handleChange(newValue);
      }}
      className="w-full"
      {...inputProps}
    />
  );
};
