
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StickyFilterHeaderProps {
  filteredCount: number;
  missingFacCount: number;
  totalCount: number;
  percentAssigned: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const StickyFilterHeader = ({
  filteredCount,
  missingFacCount,
  totalCount,
  percentAssigned,
  isOpen,
  onToggle,
  children
}: StickyFilterHeaderProps) => {
  return (
    <div className="sticky top-0 z-40 bg-white border-b pb-2 mb-2 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:gap-6 gap-2 px-2 pt-2">
        <div className="flex gap-2 items-center">
          <span className="text-md font-semibold text-gray-700">
            Examens filtrés : {filteredCount}
          </span>
          <Badge variant="destructive">
            {missingFacCount} sans faculté
          </Badge>
          <Badge variant="outline" className="text-xs ml-1">{percentAssigned}% assignés</Badge>
        </div>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onToggle}>
          {isOpen ? (
            <>
              Masquer filtres <ChevronUp className="inline ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Afficher filtres <ChevronDown className="inline ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {isOpen && (
        <div className="animate-fade-in px-2">
          {children}
        </div>
      )}
    </div>
  );
};
