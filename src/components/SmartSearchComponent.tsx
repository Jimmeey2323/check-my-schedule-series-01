import React, { useState, useMemo, useCallback } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Bookmark,
  BookmarkPlus,
  X,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';

interface SmartSearchProps {
  data: {[day: string]: ClassData[]};
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSearchResults?: (results: ClassData[]) => void;
}

interface ConflictResult {
  type: 'time_overlap' | 'trainer_double_booking' | 'location_overlap';
  severity: 'high' | 'medium' | 'low';
  message: string;
  affectedClasses: ClassData[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  icon: string;
}

const PRESET_FILTERS: SavedFilter[] = [
  {
    id: 'morning',
    name: 'Morning Classes',
    filters: { day: [], location: [], trainer: [], className: [], searchQuery: '' },
    icon: '🌅'
  },
  {
    id: 'weekend',
    name: 'Weekend Classes',
    filters: { day: ['Saturday', 'Sunday'], location: [], trainer: [], className: [], searchQuery: '' },
    icon: '🏖️'
  },
  {
    id: 'popular',
    name: 'Popular Classes',
    filters: { day: [], location: [], trainer: [], className: [], searchQuery: '' },
    icon: '🔥'
  },
  {
    id: 'conflicts',
    name: 'Potential Conflicts',
    filters: { day: [], location: [], trainer: [], className: [], searchQuery: '' },
    icon: '⚠️'
  }
];

export function SmartSearchComponent({ data, filters, onFilterChange, onSearchResults }: SmartSearchProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(PRESET_FILTERS);
  const [showConflicts, setShowConflicts] = useState(false);

  // Flatten all classes for analysis
  const allClasses = useMemo(() => {
    return Object.values(data).flat();
  }, [data]);

  // Smart search with fuzzy matching
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allClasses;

    const query = searchQuery.toLowerCase();
    return allClasses.filter(cls => {
      const searchableText = [
        cls.className,
        cls.trainer1,
        cls.location,
        cls.day,
        cls.time,
        cls.notes
      ].join(' ').toLowerCase();

      // Fuzzy matching - check if query words appear in any order
      const queryWords = query.split(' ').filter(word => word.length > 0);
      return queryWords.every(word => searchableText.includes(word));
    });
  }, [allClasses, searchQuery]);

  // Conflict detection system
  const conflicts = useMemo((): ConflictResult[] => {
    const results: ConflictResult[] = [];
    
    // Group classes by day for conflict detection
    const classByDay = allClasses.reduce((acc, cls) => {
      if (!acc[cls.day]) acc[cls.day] = [];
      acc[cls.day].push(cls);
      return acc;
    }, {} as {[day: string]: ClassData[]});

    Object.entries(classByDay).forEach(([day, classes]) => {
      // Check for time overlaps in same location
      classes.forEach((cls1, i) => {
        classes.slice(i + 1).forEach(cls2 => {
          if (cls1.location === cls2.location && cls1.timeDate && cls2.timeDate) {
            const timeDiff = Math.abs(cls1.timeDate.getTime() - cls2.timeDate.getTime());
            if (timeDiff < 60 * 60 * 1000) { // Less than 1 hour apart
              results.push({
                type: 'location_overlap',
                severity: 'high',
                message: `Location conflict: ${cls1.location} on ${day}`,
                affectedClasses: [cls1, cls2]
              });
            }
          }

          // Check for trainer double booking
          if (cls1.trainer1 === cls2.trainer1 && cls1.timeDate && cls2.timeDate) {
            const timeDiff = Math.abs(cls1.timeDate.getTime() - cls2.timeDate.getTime());
            if (timeDiff < 30 * 60 * 1000) { // Less than 30 minutes apart
              results.push({
                type: 'trainer_double_booking',
                severity: 'high',
                message: `Trainer ${cls1.trainer1} double-booked on ${day}`,
                affectedClasses: [cls1, cls2]
              });
            }
          }
        });
      });
    });

    return results;
  }, [allClasses]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    const newFilters = { ...filters, searchQuery: value };
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const applyPresetFilter = useCallback((preset: SavedFilter) => {
    const newFilters = { ...preset.filters };
    
    // Apply special logic for preset filters
    switch (preset.id) {
      case 'morning':
        // Filter classes before 12 PM
        break;
      case 'conflicts':
        setShowConflicts(true);
        break;
      default:
        break;
    }
    
    onFilterChange(newFilters);
    setSearchQuery(newFilters.searchQuery || '');
  }, [onFilterChange]);

  const saveCurrentFilter = useCallback(() => {
    const filterName = prompt('Enter a name for this filter:');
    if (!filterName) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
      icon: '📌'
    };

    setSavedFilters(prev => [...prev, newFilter]);
  }, [filters]);

  const clearAllFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      day: [],
      location: [],
      trainer: [],
      className: [],
      searchQuery: ''
    };
    onFilterChange(clearedFilters);
    setSearchQuery('');
    setShowConflicts(false);
  }, [onFilterChange]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Smart Search Bar */}
      <div className="glass-card neat-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg gradient-primary">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gradient-primary">Smart Search & Analytics</h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search classes, trainers, locations, or any keyword..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg neat-border input-glass"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results Summary */}
        {searchQuery && (
          <div className="mt-4 p-3 glass rounded-lg neat-border">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Found {searchResults.length} results</span>
              {searchResults.length !== allClasses.length && (
                <span className="text-muted-foreground">
                  out of {allClasses.length} total classes
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Filter Presets */}
      <div className="glass-card neat-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gradient-secondary">Quick Filters</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentFilter}
              className="neat-border"
            >
              <BookmarkPlus className="h-4 w-4 mr-1" />
              Save Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="neat-border"
            >
              Clear All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {savedFilters.map((preset, index) => (
            <Button
              key={preset.id}
              variant="outline"
              onClick={() => applyPresetFilter(preset)}
              className="neat-border h-auto p-4 flex flex-col items-center gap-2 animate-slideUp"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="text-2xl">{preset.icon}</div>
              <span className="text-sm font-medium">{preset.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Conflict Detection Panel */}
      {conflicts.length > 0 && (
        <div className="glass-card neat-border-dark rounded-xl p-6 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <h4 className="font-bold text-orange-800">Schedule Conflicts Detected</h4>
            <Badge variant="destructive" className="ml-auto">
              {conflicts.length} issue{conflicts.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-3">
            {conflicts.slice(0, 3).map((conflict, index) => (
              <div
                key={index}
                className="p-4 bg-orange-50 neat-border rounded-lg animate-slideUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-orange-800 mb-1">
                      {conflict.message}
                    </div>
                    <div className="text-sm text-orange-600">
                      Affected: {conflict.affectedClasses.map(cls => cls.className).join(', ')}
                    </div>
                  </div>
                  <Badge
                    variant={conflict.severity === 'high' ? 'destructive' : 'secondary'}
                    className="ml-2"
                  >
                    {conflict.severity}
                  </Badge>
                </div>
              </div>
            ))}

            {conflicts.length > 3 && (
              <Button
                variant="outline"
                onClick={() => setShowConflicts(!showConflicts)}
                className="w-full neat-border"
              >
                {showConflicts ? 'Show Less' : `Show ${conflicts.length - 3} More Conflicts`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Data Quality Insights */}
      <div className="glass-card neat-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg gradient-accent">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <h4 className="font-bold text-gradient-primary">Data Quality Insights</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 glass neat-border rounded-lg">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">
              {Math.round((allClasses.filter(cls => cls.timeDate).length / allClasses.length) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Time Parsed</div>
          </div>
          
          <div className="text-center p-4 glass neat-border rounded-lg">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">
              {new Set(allClasses.map(cls => cls.trainer1)).size}
            </div>
            <div className="text-sm text-muted-foreground">Unique Trainers</div>
          </div>
          
          <div className="text-center p-4 glass neat-border rounded-lg">
            <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">
              {allClasses.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Classes</div>
          </div>
          
          <div className="text-center p-4 glass neat-border rounded-lg">
            <Filter className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">
              {searchResults.length}
            </div>
            <div className="text-sm text-muted-foreground">Filtered Results</div>
          </div>
        </div>
      </div>
    </div>
  );
}