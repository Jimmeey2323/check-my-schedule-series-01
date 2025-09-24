
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="gradient-background min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-30 flex-shrink-0 animate-fadeIn">
        <div className="p-4">
          <h1 className="text-2xl font-semibold text-gradient-primary text-center">
            Class Schedule Viewer
          </h1>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl flex flex-col min-h-0">
        {children}
      </main>
      <footer className="glass flex-shrink-0">
        <div className="text-center py-3 text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Class Schedule Viewer
        </div>
      </footer>
    </div>
  );
}
