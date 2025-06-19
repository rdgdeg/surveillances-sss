
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { EnseignantExamenForm } from "@/components/EnseignantExamenForm";

const EnseignantRedirect = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      <UCLouvainHeader />
      <main className="flex-1 w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Espace Enseignant
              </h1>
              <p className="text-gray-600">
                Confirmez vos besoins en surveillance pour vos examens
              </p>
            </div>
            <EnseignantExamenForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EnseignantRedirect;
