
import { AdminLayout } from "@/components/AdminLayout";
import { DemandesSpecifiquesManager } from "@/components/DemandesSpecifiquesManager";

const AdminDemandesSpecifiques = () => {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Demandes Spécifiques</h1>
          <p className="text-gray-600 mt-2">
            Gestion des surveillances obligatoires et demandes spécifiques des surveillants.
          </p>
        </div>
        <div className="w-full">
          <DemandesSpecifiquesManager />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDemandesSpecifiques;
