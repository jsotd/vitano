import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vitano — Scan your meal",
  description: "AI food scanning for lifters.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {children}
    </div>
  );
}
