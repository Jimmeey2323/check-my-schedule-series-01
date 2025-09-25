
import React from 'react';
import { FileSpreadsheet, FileText, Search, Scale, FileX, Sparkles, Activity } from 'lucide-react';

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
      case 'csv': return <FileSpreadsheet className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'compare': return <Search className="w-5 h-5" />;
      case 'side-by-side': return <Scale className="w-5 h-5" />;
      case 'quick-mismatch': return <FileX className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getTabColor = (tabId: string) => {
    switch (tabId) {
      case 'csv': return 'text-emerald-500';
      case 'pdf': return 'text-blue-500';
      case 'compare': return 'text-purple-500';
      case 'side-by-side': return 'text-orange-500';
      case 'quick-mismatch': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="relative animate-fadeIn">
      <div className="glass-card rounded-xl p-2 mb-6 shadow-lg border-white/30">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`relative flex items-center gap-3 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 whitespace-nowrap hover:scale-105 animate-slideUp ${
                activeTab === tab.id
                  ? 'gradient-primary text-white shadow-lg'
                  : 'glass border-white/30 hover:bg-white/20 text-gray-700'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onTabChange(tab.id)}
            >
              <div className={`transition-colors duration-200 ${
                activeTab === tab.id ? 'text-white' : getTabColor(tab.id)
              }`}>
                {getTabIcon(tab.id)}
              </div>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full shadow-sm animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
        
        {/* Active Tab Indicator */}
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-white/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Navigate between data views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
