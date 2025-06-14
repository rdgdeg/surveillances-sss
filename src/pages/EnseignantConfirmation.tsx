
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { EnseignantExamenForm } from "@/components/EnseignantExamenForm";

const EnseignantConfirmation = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <EnseignantExamenForm />
      </main>
      <Footer />
    </div>
  );
};

export default EnseignantConfirmation;
