
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
  return (
    <div 
      className="flex gap-2 border-b-2 border-slate-200 mb-4 flex-wrap" 
      role="tablist"
      aria-label="Select data source"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`px-4 py-2 rounded-t-lg border border-b-0 transition-colors ${
            activeTab === tab.id
              ? 'bg-white border-blue-500 text-blue-600 font-semibold'
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
