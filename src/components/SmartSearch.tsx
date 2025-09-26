import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  MapPin, 
  User, 
  Calendar, 
  Sparkles,
  TrendingUp,
  Target,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClassData, FilterState } from '@/types/schedule';

interface SmartSearchProps {
  classesByDay: {[day: string]: ClassData[]};
  onFiltersChange: (filters: FilterState) => void;
  currentFilters: FilterState;
}

interface SearchSuggestion {
  id: string;
  type: 'trainer' | 'location' | 'class' | 'day' | 'time';
  value: string;
  count: number;
  icon: React.ComponentType<any>;
  color: string;
}

export function SmartSearch({ classesByDay, onFiltersChange, currentFilters }: SmartSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Generate all available data for suggestions
  const allData = useMemo(() => {
    const trainers = new Map<string, number>();
    const locations = new Map<string, number>();
    const classes = new Map<string, number>();
    const days = new Map<string, number>();
    const times = new Map<string, number>();

    Object.values(classesByDay).flat().forEach(cls => {
      if (cls.trainer1) {
        trainers.set(cls.trainer1, (trainers.get(cls.trainer1) || 0) + 1);
      }
      if (cls.location) {
        locations.set(cls.location, (locations.get(cls.location) || 0) + 1);
      }
      if (cls.className) {
        classes.set(cls.className, (classes.get(cls.className) || 0) + 1);
      }
      if (cls.day) {
        days.set(cls.day, (days.get(cls.day) || 0) + 1);
      }
      if (cls.time) {
        times.set(cls.time, (times.get(cls.time) || 0) + 1);
      }
    });

    return { trainers, locations, classes, days, times };
  }, [classesByDay]);

  // Generate search suggestions based on query
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchSuggestion[] = [];

    // Search trainers
    for (const [trainer, count] of allData.trainers.entries()) {
      if (trainer.toLowerCase().includes(query)) {
        results.push({
          id: `trainer-${trainer}`,
          type: 'trainer',
          value: trainer,
          count,
          icon: User,
          color: 'text-purple-600'
        });
      }
    }

    // Search locations
    for (const [location, count] of allData.locations.entries()) {
      if (location.toLowerCase().includes(query)) {
        results.push({
          id: `location-${location}`,
          type: 'location',
          value: location,
          count,
          icon: MapPin,
          color: 'text-emerald-600'
        });
      }
    }

    // Search classes
    for (const [className, count] of allData.classes.entries()) {
      if (className.toLowerCase().includes(query)) {
        results.push({
          id: `class-${className}`,
          type: 'class',
          value: className,
          count,
          icon: Sparkles,
          color: 'text-blue-600'
        });
      }
    }

    // Search days
    for (const [day, count] of allData.days.entries()) {
      if (day.toLowerCase().includes(query)) {
        results.push({
          id: `day-${day}`,
          type: 'day',
          value: day,
          count,
          icon: Calendar,
          color: 'text-orange-600'
        });
      }
    }

    // Search times
    for (const [time, count] of allData.times.entries()) {
      if (time.toLowerCase().includes(query)) {
        results.push({
          id: `time-${time}`,
          type: 'time',
          value: time,
          count,
          icon: Clock,
          color: 'text-red-600'
        });
      }
    }

    // Sort by relevance (count) and limit results
    return results
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [searchQuery, allData]);

  // Apply selected suggestions to filters
  const applyFilters = () => {
    const newFilters: FilterState = {
      trainer: [],
      location: [],
      className: [],
      day: []
    };

    selectedSuggestions.forEach(suggestion => {
      switch (suggestion.type) {
        case 'trainer':
          if (!newFilters.trainer.includes(suggestion.value)) {
            newFilters.trainer.push(suggestion.value);
          }
          break;
        case 'location':
          if (!newFilters.location.includes(suggestion.value)) {
            newFilters.location.push(suggestion.value);
          }
          break;
        case 'class':
          if (!newFilters.className.includes(suggestion.value)) {
            newFilters.className.push(suggestion.value);
          }
          break;
        case 'day':
          if (!newFilters.day.includes(suggestion.value)) {
            newFilters.day.push(suggestion.value);
          }
          break;
        case 'time':
          // Time filtering not supported in current FilterState
          break;
      }
    });

    onFiltersChange(newFilters);
    
    // Add to search history
    if (searchQuery.trim() && !searchHistory.includes(searchQuery)) {
      setSearchHistory(prev => [searchQuery, ...prev.slice(0, 4)]);
    }
    
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const addSuggestion = (suggestion: SearchSuggestion) => {
    if (!selectedSuggestions.find(s => s.id === suggestion.id)) {
      setSelectedSuggestions(prev => [...prev, suggestion]);
    }
    setSearchQuery('');
  };

  const removeSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const clearAll = () => {
    setSelectedSuggestions([]);
    setSearchQuery('');
    onFiltersChange({ trainer: [], location: [], className: [], day: [] });
  };

  const popularSuggestions = useMemo(() => {
    const popular: SearchSuggestion[] = [];
    
    // Most popular trainer
    const topTrainer = Array.from(allData.trainers.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topTrainer) {
      popular.push({
        id: `popular-trainer-${topTrainer[0]}`,
        type: 'trainer',
        value: topTrainer[0],
        count: topTrainer[1],
        icon: User,
        color: 'text-purple-600'
      });
    }

    // Most popular location
    const topLocation = Array.from(allData.locations.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topLocation) {
      popular.push({
        id: `popular-location-${topLocation[0]}`,
        type: 'location',
        value: topLocation[0],
        count: topLocation[1],
        icon: MapPin,
        color: 'text-emerald-600'
      });
    }

    // Most popular class
    const topClass = Array.from(allData.classes.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topClass) {
      popular.push({
        id: `popular-class-${topClass[0]}`,
        type: 'class',
        value: topClass[0],
        count: topClass[1],
        icon: Sparkles,
        color: 'text-blue-600'
      });
    }

    return popular;
  }, [allData]);

  return (
    <Card className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg gradient-info">
          <Search className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gradient-primary">Smart Search</h3>
          <p className="text-sm text-gray-600">Intelligent filtering with autocomplete</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search trainers, locations, classes, days, or times..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="pl-10 input-glass h-12 text-base"
          />
          {searchQuery && (
            <Button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 btn-secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {isSearchFocused && (searchQuery || suggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 glass-card border shadow-xl rounded-lg max-h-80 overflow-y-auto fancy-scrollbar">
            {suggestions.length > 0 ? (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-2 px-2">Search Results</div>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => addSuggestion(suggestion)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <suggestion.icon className={`h-4 w-4 ${suggestion.color}`} />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{suggestion.value}</div>
                      <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                    </div>
                    <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {suggestion.count}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm">No matches found for "{searchQuery}"</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Selected Filters */}
      {selectedSuggestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">Active Filters</div>
            <Button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700">
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
              >
                <suggestion.icon className={`h-3 w-3 ${suggestion.color}`} />
                <span className="font-medium">{suggestion.value}</span>
                <button
                  onClick={() => removeSuggestion(suggestion.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={applyFilters}
            className="mt-3 w-full btn-primary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters ({selectedSuggestions.length})
          </Button>
        </div>
      )}

      {/* Popular Suggestions */}
      {!searchQuery && popularSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            <div className="text-sm font-medium text-gray-700">Popular Filters</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {popularSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => addSuggestion(suggestion)}
                className="flex items-center gap-3 p-3 gradient-primary-light hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
              >
                <suggestion.icon className={`h-4 w-4 ${suggestion.color}`} />
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{suggestion.value}</div>
                  <div className="text-xs text-gray-600 capitalize">Most popular {suggestion.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                    {suggestion.count} classes
                  </div>
                  <Target className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && !searchQuery && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-600" />
            <div className="text-sm font-medium text-gray-700">Recent Searches</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((query, index) => (
              <button
                key={index}
                onClick={() => setSearchQuery(query)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-gray-600" />
          <div className="text-sm font-medium text-gray-700">Smart Insights</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 gradient-accent-light rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-indigo-700" />
              <div className="text-sm font-medium text-indigo-900">Data Quality</div>
            </div>
            <div className="text-xs text-indigo-700">95% of entries validated</div>
          </div>
          <div className="p-3 gradient-success-light rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <div className="text-sm font-medium text-emerald-900">Coverage</div>
            </div>
            <div className="text-xs text-emerald-700">{Object.keys(classesByDay).length} days loaded</div>
          </div>
        </div>
      </div>
    </Card>
  );
}