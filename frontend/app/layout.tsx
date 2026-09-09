import "reactflow/dist/style.css";
import "./globals.css";

export const metadata = {
  title: "System Design Canvas",
  description: "A simple system design diagram editor",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
