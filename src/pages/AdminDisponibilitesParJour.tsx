
import { AdminLayout } from "@/components/AdminLayout";
import { DisponibilitesParJour } from "@/components/DisponibilitesParJour";

const AdminDisponibilitesParJour = () => {
  return (
    <AdminLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900">Vue par jour</h1>
          <p className="text-gray-600 mt-2">
            Visualisez les disponibilités des surveillants organisées par jour d'examen.
          </p>
        </div>
        <div className="w-full">
          <DisponibilitesParJour />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDisponibilitesParJour;
