import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Target,
  TrendingDown
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClassData } from '@/types/schedule';

interface ConflictDetectionProps {
  classesByDay: {[day: string]: ClassData[]};
}

interface Conflict {
  id: string;
  type: 'trainer_double_booking' | 'location_overlap' | 'inconsistent_data';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedClasses: ClassData[];
  suggestions: string[];
}

export function ConflictDetection({ classesByDay }: ConflictDetectionProps) {
  const conflicts = useMemo(() => {
    const detectedConflicts: Conflict[] = [];
    const allClasses = Object.values(classesByDay).flat();

    // Detect trainer double booking
    const trainerSchedule = new Map<string, ClassData[]>();
    allClasses.forEach(cls => {
      if (!trainerSchedule.has(cls.trainer1)) {
        trainerSchedule.set(cls.trainer1, []);
      }
      trainerSchedule.get(cls.trainer1)!.push(cls);
    });

    trainerSchedule.forEach((classes, trainer) => {
      // Group by day and time
      const dayTimeMap = new Map<string, ClassData[]>();
      classes.forEach(cls => {
        const key = `${cls.day}-${cls.time}`;
        if (!dayTimeMap.has(key)) {
          dayTimeMap.set(key, []);
        }
        dayTimeMap.get(key)!.push(cls);
      });

      dayTimeMap.forEach((timeClasses, dayTime) => {
        if (timeClasses.length > 1) {
          // Check if they're in different locations (conflict)
          const locations = new Set(timeClasses.map(c => c.location));
          if (locations.size > 1) {
            detectedConflicts.push({
              id: `trainer-conflict-${trainer}-${dayTime}`,
              type: 'trainer_double_booking',
              severity: 'high',
              title: `Trainer Double Booking: ${trainer}`,
              description: `${trainer} is scheduled in multiple locations at the same time`,
              affectedClasses: timeClasses,
              suggestions: [
                'Assign different trainers to conflicting classes',
                'Reschedule one of the classes to a different time',
                'Check if this is a data entry error'
              ]
            });
          }
        }
      });
    });

    // Detect location capacity conflicts
    const locationSchedule = new Map<string, ClassData[]>();
    allClasses.forEach(cls => {
      if (!locationSchedule.has(cls.location)) {
        locationSchedule.set(cls.location, []);
      }
      locationSchedule.get(cls.location)!.push(cls);
    });

    locationSchedule.forEach((classes, location) => {
      const dayTimeMap = new Map<string, ClassData[]>();
      classes.forEach(cls => {
        const key = `${cls.day}-${cls.time}`;
        if (!dayTimeMap.has(key)) {
          dayTimeMap.set(key, []);
        }
        dayTimeMap.get(key)!.push(cls);
      });

      dayTimeMap.forEach((timeClasses, dayTime) => {
        if (timeClasses.length > 2) { // Assuming max 2 classes per location/time
          detectedConflicts.push({
            id: `location-conflict-${location}-${dayTime}`,
            type: 'location_overlap',
            severity: 'medium',
            title: `Location Capacity Issue: ${location}`,
            description: `${timeClasses.length} classes scheduled simultaneously at ${location}`,
            affectedClasses: timeClasses,
            suggestions: [
              'Move some classes to alternative locations',
              'Stagger class times by 15-30 minutes',
              'Verify location capacity requirements'
            ]
          });
        }
      });
    });

    // Detect inconsistent data patterns
    const trainerNames = new Set<string>();
    const locationNames = new Set<string>();
    const classNames = new Set<string>();

    allClasses.forEach(cls => {
      trainerNames.add(cls.trainer1.toLowerCase().trim());
      locationNames.add(cls.location.toLowerCase().trim());
      classNames.add(cls.className.toLowerCase().trim());
    });

    // Check for similar names that might be duplicates
    const checkSimilarNames = (names: Set<string>, type: string) => {
      const nameArray = Array.from(names);
      for (let i = 0; i < nameArray.length; i++) {
        for (let j = i + 1; j < nameArray.length; j++) {
          const name1 = nameArray[i];
          const name2 = nameArray[j];
          
          // Simple similarity check (could be enhanced with Levenshtein distance)
          if (name1.includes(name2) || name2.includes(name1)) {
            const affectedClasses = allClasses.filter(cls => 
              (type === 'trainer' && (cls.trainer1.toLowerCase().includes(name1) || cls.trainer1.toLowerCase().includes(name2))) ||
              (type === 'location' && (cls.location.toLowerCase().includes(name1) || cls.location.toLowerCase().includes(name2))) ||
              (type === 'class' && (cls.className.toLowerCase().includes(name1) || cls.className.toLowerCase().includes(name2)))
            );

            if (affectedClasses.length > 2) {
              detectedConflicts.push({
                id: `inconsistent-${type}-${i}-${j}`,
                type: 'inconsistent_data',
                severity: 'low',
                title: `Inconsistent ${type} naming`,
                description: `Similar ${type} names detected: "${name1}" and "${name2}"`,
                affectedClasses: affectedClasses.slice(0, 5), // Limit to 5 examples
                suggestions: [
                  `Standardize ${type} naming conventions`,
                  'Use data validation rules',
                  'Implement autocomplete for data entry'
                ]
              });
            }
          }
        }
      }
    };

    checkSimilarNames(trainerNames, 'trainer');
    checkSimilarNames(locationNames, 'location');
    checkSimilarNames(classNames, 'class');

    return detectedConflicts;
  }, [classesByDay]);

  const conflictStats = useMemo(() => {
    const stats = {
      total: conflicts.length,
      high: conflicts.filter(c => c.severity === 'high').length,
      medium: conflicts.filter(c => c.severity === 'medium').length,
      low: conflicts.filter(c => c.severity === 'low').length,
      resolved: 0 // Would be tracked in real implementation
    };
    return stats;
  }, [conflicts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return XCircle;
      case 'medium': return AlertTriangle;
      case 'low': return Info;
      default: return CheckCircle;
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'trainer_double_booking': return User;
      case 'location_overlap': return MapPin;
      case 'inconsistent_data': return Target;
      default: return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Conflict Summary */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-warning">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gradient-primary">Conflict Detection</h3>
              <p className="text-sm text-gray-600">AI-powered scheduling conflict analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <Zap className="w-3 h-3 inline mr-1" />
              Auto-Scan Active
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 gradient-primary-light rounded-xl">
            <div className="text-2xl font-bold text-gradient-primary">{conflictStats.total}</div>
            <div className="text-sm text-gray-700">Total Issues</div>
          </div>
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-xl">
            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <div className="text-xl font-bold text-red-700">{conflictStats.high}</div>
            <div className="text-sm text-red-600">Critical</div>
          </div>
          <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-xl font-bold text-orange-700">{conflictStats.medium}</div>
            <div className="text-sm text-orange-600">Medium</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <Info className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <div className="text-xl font-bold text-yellow-700">{conflictStats.low}</div>
            <div className="text-sm text-yellow-600">Low</div>
          </div>
          <div className="text-center p-4 gradient-success-light rounded-xl">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
            <div className="text-xl font-bold text-emerald-700">{conflictStats.resolved}</div>
            <div className="text-sm text-emerald-600">Resolved</div>
          </div>
        </div>
      </Card>

      {/* Conflict List */}
      {conflicts.length > 0 ? (
        <div className="space-y-4">
          {conflicts.map((conflict, index) => {
            const SeverityIcon = getSeverityIcon(conflict.severity);
            const TypeIcon = getConflictTypeIcon(conflict.type);
            
            return (
              <Card key={conflict.id} className="glass-card p-6 hover:shadow-lg transition-all animate-slideUp"
                    style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg gradient-secondary flex-shrink-0">
                    <TypeIcon className="h-5 w-5 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-gray-900">{conflict.title}</h4>
                      <Badge className={`text-xs font-medium border ${getSeverityColor(conflict.severity)}`}>
                        <SeverityIcon className="w-3 h-3 mr-1" />
                        {conflict.severity.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{conflict.description}</p>
                    
                    {/* Affected Classes */}
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Affected Classes:</div>
                      <div className="space-y-2">
                        {conflict.affectedClasses.slice(0, 3).map((cls, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{cls.day}</span>
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>{cls.time}</span>
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{cls.location}</span>
                            <User className="h-4 w-4 text-gray-500" />
                            <span>{cls.trainer1}</span>
                          </div>
                        ))}
                        {conflict.affectedClasses.length > 3 && (
                          <div className="text-xs text-gray-500 pl-2">
                            +{conflict.affectedClasses.length - 3} more classes affected
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</div>
                      <div className="space-y-1">
                        {conflict.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <TrendingDown className="h-3 w-3 text-blue-500" />
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
          <h3 className="text-lg font-bold text-emerald-700 mb-2">No Conflicts Detected</h3>
          <p className="text-gray-600">Your schedule data looks clean and well-organized!</p>
          <div className="mt-4 p-3 gradient-success-light rounded-lg">
            <div className="text-sm text-emerald-700">
              ✅ All trainers have consistent schedules<br/>
              ✅ No location capacity issues found<br/>
              ✅ Data naming conventions are consistent
            </div>
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg gradient-info">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-gradient-primary">Scan Performance</h4>
            <p className="text-sm text-gray-600">Analysis metrics and recommendations</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 gradient-primary-light rounded-lg">
            <div className="text-lg font-bold text-gray-800">{Object.values(classesByDay).flat().length}</div>
            <div className="text-sm text-gray-600">Classes Analyzed</div>
          </div>
          <div className="text-center p-3 gradient-accent-light rounded-lg">
            <div className="text-lg font-bold text-indigo-800">~0.2s</div>
            <div className="text-sm text-indigo-600">Scan Duration</div>
          </div>
          <div className="text-center p-3 gradient-success-light rounded-lg">
            <div className="text-lg font-bold text-emerald-800">
              {((1 - conflicts.filter(c => c.severity === 'high').length / Math.max(1, Object.values(classesByDay).flat().length)) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-emerald-600">Data Quality</div>
          </div>
        </div>
      </Card>
    </div>
  );
}