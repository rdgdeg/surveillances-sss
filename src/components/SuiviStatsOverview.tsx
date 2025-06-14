
import { Users, CheckCircle, Clock } from "lucide-react";

interface SuiviStatsOverviewProps {
  stats: {
    total_surveillants: number;
    ont_repondu: number;
    completion_moyenne: number;
  };
  totalCreneaux: number;
}

export const SuiviStatsOverview = ({ stats, totalCreneaux }: SuiviStatsOverviewProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
      <Users className="h-8 w-8 text-blue-500" />
      <div>
        <p className="text-2xl font-bold text-blue-600">{stats.total_surveillants}</p>
        <p className="text-sm text-blue-700">Surveillants actifs</p>
      </div>
    </div>
    <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
      <CheckCircle className="h-8 w-8 text-green-500" />
      <div>
        <p className="text-2xl font-bold text-green-600">{stats.ont_repondu}</p>
        <p className="text-sm text-green-700">Ont commencé à répondre</p>
      </div>
    </div>
    <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
      <Clock className="h-8 w-8 text-orange-500" />
      <div>
        <p className="text-2xl font-bold text-orange-600">{stats.completion_moyenne}%</p>
        <p className="text-sm text-orange-700">Completion moyenne</p>
      </div>
    </div>
    <div className="col-span-full font-semibold text-blue-700 text-center mt-2">
      Créneaux total attendus (session): {totalCreneaux}
    </div>
  </div>
);
