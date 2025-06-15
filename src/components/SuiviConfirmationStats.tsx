
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SuiviConfirmationStatsProps {
  examens: any[];
}

export function SuiviConfirmationStats({ examens }: SuiviConfirmationStatsProps) {
  const totalExamens = examens.length;
  const examensInformationsFournies = examens.filter(ex => 
    ex.surveillants_enseignant !== null || ex.surveillants_amenes > 0
  ).length;
  const examensConfirmes = examens.filter(ex => ex.besoins_confirmes_par_enseignant).length;
  const examensEnAttente = totalExamens - examensInformationsFournies;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total examens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalExamens}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Informations fournies par enseignant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{examensInformationsFournies}</div>
          <p className="text-xs text-gray-500">
            {totalExamens > 0 ? Math.round((examensInformationsFournies / totalExamens) * 100) : 0}% du total
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Besoins confirmés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{examensConfirmes}</div>
          <p className="text-xs text-gray-500">
            {examensInformationsFournies > 0 ? Math.round((examensConfirmes / examensInformationsFournies) * 100) : 0}% des informations fournies
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">En attente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{examensEnAttente}</div>
          <p className="text-xs text-gray-500">
            {totalExamens > 0 ? Math.round((examensEnAttente / totalExamens) * 100) : 0}% du total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
