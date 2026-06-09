import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Korea Space Support MCP",
  description: "Find Korean space and aerospace support programs with your AI agent."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
