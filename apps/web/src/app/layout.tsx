import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse — The All-in-One Life & Work OS',
  description: 'Your personal finance, MCP hub, AI assistant, and task management dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-bg text-text selection:bg-primary/20">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
