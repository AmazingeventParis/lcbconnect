import { Anchor } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1E3A5F] via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-3">
            <Anchor className="size-10 text-white" />
            <h1 className="text-3xl font-bold text-white">LCBconnect</h1>
          </div>
          <p className="text-[#D4A853]">La Cerise sur le Bateau</p>
        </div>
        {children}
      </div>
    </div>
  );
}
