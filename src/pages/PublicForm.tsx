import { CollecteSurveillants } from "@/components/CollecteSurveillants";
import { Footer } from "@/components/Footer";
import { HomeButton } from "@/components/HomeButton";

const PublicForm = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <CollecteSurveillants />
      </div>
      <Footer />
    </div>
  );
};

export default PublicForm;
