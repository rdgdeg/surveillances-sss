
import { AuthForm } from "@/components/AuthForm";
import { UCLouvainHeader } from "@/components/UCLouvainHeader";
import { Footer } from "@/components/Footer";

export default function AuthPage() {
  return (
    <>
      <UCLouvainHeader />
      <main className="flex-1">
        <AuthForm />
      </main>
      <Footer />
    </>
  );
}
