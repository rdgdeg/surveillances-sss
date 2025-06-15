
import { Badge } from "@/components/ui/badge";

interface RecapStatsProps {
  total: number;
  actifs: number;
  inactifs: number;
  typeMap: Record<string, number>;
}

export function SurveillantStatsRecap({ total, actifs, inactifs, typeMap }: RecapStatsProps) {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
      <div className="flex flex-col items-center bg-blue-50 border rounded p-2">
        <span className="text-xs text-gray-500">Total</span>
        <span className="text-xl font-bold text-uclouvain-blue">{total}</span>
      </div>
      <div className="flex flex-col items-center bg-emerald-50 border rounded p-2">
        <span className="text-xs text-gray-500">Actifs</span>
        <span className="text-lg font-semibold text-emerald-700">{actifs}</span>
      </div>
      <div className="flex flex-col items-center bg-red-50 border rounded p-2">
        <span className="text-xs text-gray-500">Inactifs</span>
        <span className="text-lg font-semibold text-red-600">{inactifs}</span>
      </div>
      <div className="flex flex-col bg-gray-50 border rounded px-2 py-1 items-center col-span-2 sm:col-span-1">
        <span className="text-xs text-gray-500">Par type</span>
        <div className="flex flex-wrap gap-1 justify-center">
          {Object.entries(typeMap).map(([k, v]) => (
            <Badge key={k} variant="outline" className="px-1 text-xs">{k}: {v}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
