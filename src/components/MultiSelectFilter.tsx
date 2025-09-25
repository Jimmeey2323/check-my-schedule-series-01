
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MultiSelectFilterProps {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({ id, label, options, selected, onChange }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle outside clicks
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSelectAll = () => {
    onChange([...options]);
  };
  
  const handleClear = () => {
    onChange([]);
  };
  
  const handleItemToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  
  // Calculate display label
  const getButtonLabel = () => {
    if (selected.length === 0) {
      return `Select ${label.replace('Filter by ', '')}`;
    } else if (selected.length === options.length) {
      return `All ${label.replace('Filter by ', '')}`;
    } else if (selected.length === 1) {
      return selected[0];
    } else {
      return `${selected.length} selected`;
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        id={id}
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between h-11 neat-border input-glass hover:bg-white/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        onClick={toggleDropdown}
      >
        <span className="truncate text-left flex-1 font-medium text-gray-700">
          {getButtonLabel()}
        </span>
        <div className="flex items-center ml-2">
          {selected.length > 0 && (
            <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mr-2 font-bold">
              {selected.length}
            </div>
          )}
          {isOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />}
        </div>
      </Button>
      
      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full min-w-[250px] bg-white rounded-lg shadow-2xl border border-gray-200 glass-card animate-slideUp">
          <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs hover:bg-blue-50 text-blue-600 font-medium">
              ✓ Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs hover:bg-red-50 text-red-600 font-medium">
              ✗ Clear
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto fancy-scrollbar">
            {options.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No options available
              </div>
            ) : (
              options.map(option => (
                <label
                  key={option}
                  className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                >
                  <Checkbox 
                    id={`${id}-${option}`} 
                    checked={selected.includes(option)}
                    onCheckedChange={() => handleItemToggle(option)}
                    className="mr-3 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate font-medium">{option}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-3 bg-blue-50 border-t border-gray-100 rounded-b-lg">
              <div className="text-xs text-blue-600 font-medium">
                {selected.length} of {options.length} selected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
