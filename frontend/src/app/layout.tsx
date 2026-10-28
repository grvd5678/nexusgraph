import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusGraph (CortexOps) | Autonomous Engineering Brain on FalkorDB",
  description:
    "Multi-Agent Engineering Memory, Blast-Radius Traversal & Company Brain powered by FalkorDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090b10] text-gray-100 antialiased">{children}</body>
    </html>
  );
}

