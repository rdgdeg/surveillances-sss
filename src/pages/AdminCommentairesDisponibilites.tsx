
import { AdminLayout } from "@/components/AdminLayout";
import { CommentairesDisponibilitesManager } from "@/components/CommentairesDisponibilitesManager";

const AdminCommentairesDisponibilites = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commentaires des disponibilités</h1>
          <p className="text-gray-600 mt-2">
            Consultez et gérez les commentaires laissés par les surveillants.
          </p>
        </div>
        <CommentairesDisponibilitesManager />
      </div>
    </AdminLayout>
  );
};

export default AdminCommentairesDisponibilites;
