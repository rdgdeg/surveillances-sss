
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const ExamensSansFaculteAlert = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 my-2 p-2 bg-red-50 border border-red-200 rounded">
      <AlertTriangle className="text-yellow-600 w-4 h-4" />
      <span>
        <Badge variant="destructive">{count} groupe{count > 1 ? "s" : ""} sans faculté</Badge>
        <span className="ml-2 text-sm text-red-800">Attribuez une faculté avant de valider pour éviter les oublis.</span>
      </span>
    </div>
  );
};
