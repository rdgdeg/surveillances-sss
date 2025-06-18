
import { AdminLayout } from "@/components/AdminLayout";
import { SuiviDisponibilitesAdmin } from "@/components/SuiviDisponibilitesAdmin";

const AdminCandidatures = () => {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Suivi Candidatures</h1>
          <p className="text-gray-600 mt-2">
            Suivi et gestion des candidatures de surveillance.
          </p>
        </div>
        <div className="w-full">
          <SuiviDisponibilitesAdmin />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCandidatures;
