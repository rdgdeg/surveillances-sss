
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { StandardExcelImporter } from "@/components/StandardExcelImporter";

export const ExamenImportSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Import des Examens</span>
        </CardTitle>
        <CardDescription>
          Importez les données d'examens depuis un fichier Excel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StandardExcelImporter />
      </CardContent>
    </Card>
  );
};
