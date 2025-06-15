
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const FACULTES_FILTERED = [
  { value: "FASB", label: "FASB" },
  { value: "FSP", label: "FSP" },
  { value: "FSM", label: "FSM" },
  { value: "ASS", label: "ASS" },
  { value: "MEDE", label: "MEDE" },
  { value: "NONE", label: "Aucune restriction" },
  { value: "AUTRE", label: "Autre" },
];

interface FacultesMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function FacultesMultiSelect({
  values,
  onChange,
  disabled,
}: FacultesMultiSelectProps) {
  const [open, setOpen] = useState(false);

  // Gestion du 'NONE' : doit être seul si sélectionné
  function handleCheck(val: string) {
    if (val === "NONE") {
      onChange(values.includes("NONE") ? [] : ["NONE"]);
    } else {
      let newVals = values.filter((v) => v !== "NONE");
      if (values.includes(val)) {
        newVals = newVals.filter((v) => v !== val);
      } else {
        newVals = [...newVals, val];
      }
      if (newVals.length === 0) {
        onChange(["NONE"]);
      } else {
        onChange(newVals);
      }
    }
  }

  let buttonLabel =
    values.length === 0 || values.includes("NONE")
      ? "Aucune restriction"
      : values.map(
          (val) =>
            FACULTES_FILTERED.find((f) => f.value === val)?.label ?? val
        ).join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-w-36 justify-start"
          disabled={disabled}
        >
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52">
        <div className="flex flex-col gap-1">
          {FACULTES_FILTERED.map((fac) => (
            <label
              key={fac.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={values.includes(fac.value)}
                onCheckedChange={() => handleCheck(fac.value)}
                disabled={
                  fac.value === "NONE"
                    ? values.length > 0 &&
                      !values.includes("NONE")
                    : values.includes("NONE")
                }
              />
              <span>{fac.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
