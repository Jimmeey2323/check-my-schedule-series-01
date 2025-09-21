
import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabGroup({ tabs, activeTab, onTabChange }: TabGroupProps) {
  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'csv': return '📊';
      case 'pdf': return '📋';
      case 'compare': return '🔍';
      case 'side-by-side': return '⚖️';
      default: return '📄';
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-1 bg-gray-50 p-1 rounded-lg mb-6 shadow-sm border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`relative flex items-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="text-lg">{getTabIcon(tab.id)}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
