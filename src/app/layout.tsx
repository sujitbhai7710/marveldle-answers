import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marveldle Daily Answers",
  description: "Daily answers and archive for Marveldle - Comics & MCU modes. Updated automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
