
import { CollecteSurveillants } from "@/components/CollecteSurveillants";
import { Footer } from "@/components/Footer";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";

const PublicForm = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UCLouvainHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <CollecteSurveillants />
      </main>
      <Footer />
    </div>
  );
};

export default PublicForm;
