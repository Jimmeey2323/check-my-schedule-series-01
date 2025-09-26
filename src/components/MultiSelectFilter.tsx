
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
      <label htmlFor={id} className="mb-1 font-medium text-gray-700 block">
        {label}
      </label>
      <Button
        id={id}
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-56 justify-between"
        onClick={toggleDropdown}
      >
        <span className="truncate">{getButtonLabel()}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-56 overflow-auto rounded-md bg-white py-1 shadow-lg border border-gray-200">
          <div className="flex justify-between p-2 border-b">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs">
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs">
              Clear
            </Button>
          </div>
          <div className="py-1">
            {options.map(option => (
              <label
                key={option}
                className="flex items-center px-2 py-1.5 hover:bg-blue-50 cursor-pointer"
              >
                <Checkbox 
                  id={`${id}-${option}`} 
                  checked={selected.includes(option)}
                  onCheckedChange={() => handleItemToggle(option)}
                  className="mr-2"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
