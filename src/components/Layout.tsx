
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <header className="bg-white shadow-md p-4 sticky top-0 z-30">
        <h1 className="text-2xl font-semibold text-gray-800 text-center">Class Schedule Viewer</h1>
      </header>
      <main className="flex-grow container mx-auto px-4 py-6 max-w-7xl flex flex-col" style={{ height: 'calc(100vh - 96px)' }}>
        {children}
      </main>
      <footer className="bg-white text-center py-4 text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Class Schedule Viewer
      </footer>
    </div>
  );
}
