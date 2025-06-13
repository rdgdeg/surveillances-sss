
import { Badge } from "@/components/ui/badge";

interface ExamenReviewStatsProps {
  filteredCount: number;
  totalCount?: number;
  searchTerm: string;
  totalToAssign: number;
  uniqueAuditoires: number;
  uniqueDays: number;
}

export const ExamenReviewStats = ({
  filteredCount,
  totalCount,
  searchTerm,
  totalToAssign,
  uniqueAuditoires,
  uniqueDays
}: ExamenReviewStatsProps) => {
  return (
    <div className="border-t pt-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="font-bold text-blue-600">
            {filteredCount}
            {searchTerm && totalCount && ` / ${totalCount}`}
          </div>
          <div className="text-blue-800">
            {searchTerm ? 'Examens trouvés' : 'Examens groupés'}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="font-bold text-green-600">
            {totalToAssign}
          </div>
          <div className="text-green-800">Total à attribuer</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="font-bold text-purple-600">
            {uniqueAuditoires}
          </div>
          <div className="text-purple-800">Auditoires unifiés</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="font-bold text-orange-600">
            {uniqueDays}
          </div>
          <div className="text-orange-800">Jours d'examens</div>
        </div>
      </div>
    </div>
  );
};
