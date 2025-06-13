
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ExamenReviewFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchSuggestions: string[];
  showSuggestions: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  onSuggestionsVisibilityChange: (show: boolean) => void;
}

export const ExamenReviewFilters = ({
  searchTerm,
  onSearchChange,
  searchSuggestions,
  showSuggestions,
  onSelectSuggestion,
  onSuggestionsVisibilityChange
}: ExamenReviewFiltersProps) => {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Rechercher un examen (code, matière, auditoire)..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => onSuggestionsVisibilityChange(searchSuggestions.length > 0)}
        onBlur={() => setTimeout(() => onSuggestionsVisibilityChange(false), 200)}
        className="pl-8"
      />
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {searchSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => onSelectSuggestion(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
