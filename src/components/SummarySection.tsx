import React, { useMemo } from 'react';
import { ClassData, FilterState } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { passesFilters } from '@/utils/filterUtils';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  MapPin, 
  Activity, 
  Target, 
  TrendingUp,
  Clock,
  Award,
  Sparkles,
  Zap
} from 'lucide-react';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface SummarySectionProps {
  classesByDay: {[day: string]: ClassData[]};
  filters: FilterState;
}

export function SummarySection({ classesByDay, filters }: SummarySectionProps) {
  // Generate summary counts based on filtered data
  const summary = useMemo(() => {
    // Flatten and filter all classes
    let allClasses: ClassData[] = [];
    
    Object.entries(classesByDay).forEach(([day, dayClasses]) => {
      const filtered = dayClasses.filter(cls => 
        passesFilters(
          { day: cls.day, location: cls.location, trainer: cls.trainer1, className: cls.className },
          filters
        )
      );
      allClasses = allClasses.concat(filtered);
    });
    
    // Count by location
    const locationCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.location) return counts;
      counts[cls.location] = (counts[cls.location] || 0) + 1;
      return counts;
    }, {});
    
    // Count by trainer
    const trainerCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.trainer1) return counts;
      counts[cls.trainer1] = (counts[cls.trainer1] || 0) + 1;
      return counts;
    }, {});
    
    // Count by day
    const dayCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.day) return counts;
      counts[cls.day] = (counts[cls.day] || 0) + 1;
      return counts;
    }, {});
    
    // Count by class
    const classCounts = allClasses.reduce((counts: {[key: string]: number}, cls) => {
      if (!cls.className) return counts;
      counts[cls.className] = (counts[cls.className] || 0) + 1;
      return counts;
    }, {});
    
    // Class formats by trainer
    const classFormatsTrainer: {[trainer: string]: {[className: string]: number}} = {};
    allClasses.forEach((cls) => {
      if (!cls.trainer1 || !cls.className) return;
      if (!classFormatsTrainer[cls.trainer1]) classFormatsTrainer[cls.trainer1] = {};
      classFormatsTrainer[cls.trainer1][cls.className] = 
        (classFormatsTrainer[cls.trainer1][cls.className] || 0) + 1;
    });
    
    return {
      locationCounts,
      trainerCounts,
      dayCounts,
      classCounts,
      classFormatsTrainer,
      totalClasses: allClasses.length
    };
  }, [classesByDay, filters]);
  
  // Sort function helpers
  const sortByCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
  
  const sortByDay = (a: [string, number], b: [string, number]) => {
    const idxA = daysOrder.indexOf(a[0]);
    const idxB = daysOrder.indexOf(b[0]);
    if (idxA === -1 && idxB === -1) return a[0].localeCompare(b[0]);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  };
  
  if (summary.totalClasses === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center animate-fadeIn">
        <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Data to Analyze</h3>
        <p className="text-sm text-muted-foreground/80 mt-2">Upload schedule data to see comprehensive analytics</p>
      </div>
    );
  }
  
  // Calculate total locations and trainers
  const totalLocations = Object.keys(summary.locationCounts).length;
  const totalTrainers = Object.keys(summary.trainerCounts).length;
  const totalClasses = Object.keys(summary.classCounts).length;
  const activeDays = Object.keys(summary.dayCounts).length;
  
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Stats Section */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg gradient-primary">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gradient-primary">Analytics Overview</h2>
            <p className="text-muted-foreground">Comprehensive schedule insights & metrics</p>
          </div>
        </div>
        
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 rounded-lg text-center hover:scale-105 transition-transform">
            <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-primary">{summary.totalClasses}</div>
            <div className="text-sm text-muted-foreground">Total Classes</div>
          </div>
          <div className="glass-card p-4 rounded-lg text-center hover:scale-105 transition-transform">
            <MapPin className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">{totalLocations}</div>
            <div className="text-sm text-muted-foreground">Locations</div>
          </div>
          <div className="glass-card p-4 rounded-lg text-center hover:scale-105 transition-transform">
            <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-primary">{totalTrainers}</div>
            <div className="text-sm text-muted-foreground">Trainers</div>
          </div>
          <div className="glass-card p-4 rounded-lg text-center hover:scale-105 transition-transform">
            <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gradient-secondary">{activeDays}</div>
            <div className="text-sm text-muted-foreground">Active Days</div>
          </div>
        </div>
      </div>
      
      {/* Detailed Analytics Grid */}
      <div className="grid gap-6 auto-rows-min sm:grid-cols-2 lg:grid-cols-4">
        {/* Location Analytics */}
        <Card className="glass-card border-none hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <MapPin className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="font-bold text-gradient-secondary">Location Distribution</h3>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.locationCounts)
                .sort(sortByCount)
                .map(([location, count], index) => (
                  <div key={location} className="flex items-center justify-between p-2 glass hover:bg-white/30 rounded-lg transition-all animate-slideUp"
                       style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      <span className="font-medium text-sm">{location}</span>
                    </div>
                    <div className="px-2 py-1 glass-card rounded-full text-xs font-bold text-emerald-700">
                      {count}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Trainer Performance */}
        <Card className="glass-card border-none hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="font-bold text-gradient-primary">Trainer Workload</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.trainerCounts)
                .sort(sortByCount)
                .slice(0, 8)
                .map(([trainer, count], index) => (
                  <div key={trainer} className="glass p-3 rounded-lg hover:bg-white/30 transition-all animate-slideUp"
                       style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                          {trainer.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{trainer}</span>
                      </div>
                      <div className="px-3 py-1 gradient-secondary text-white rounded-full text-xs font-bold">
                        {count}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Weekly Schedule Heatmap */}
        <Card className="glass-card border-none hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-gradient-primary">Weekly Activity</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.dayCounts)
                .sort(sortByDay)
                .map(([day, count], index) => {
                  const maxCount = Math.max(...Object.values(summary.dayCounts));
                  const intensity = (count / maxCount) * 100;
                  return (
                    <div key={day} className="space-y-1 animate-slideUp" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{day.substring(0, 3)}</span>
                        <span className="font-bold text-blue-600">{count}</span>
                      </div>
                      <div className="w-full bg-white/30 rounded-full h-2">
                        <div 
                          className="gradient-primary h-2 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${intensity}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        
        {/* Class Format Insights */}
        <Card className="glass-card border-none hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="font-bold text-gradient-secondary">Class Popularity</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.classCounts)
                .sort(sortByCount)
                .slice(0, 10)
                .map(([className, count], index) => {
                  const maxCount = Math.max(...Object.values(summary.classCounts));
                  const popularity = (count / maxCount) * 100;
                  return (
                    <div key={className} className="space-y-2 animate-slideUp" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm truncate flex-1 mr-2">{className}</span>
                        <div className="px-2 py-1 glass-card rounded-full text-xs font-bold text-orange-700">
                          {count}
                        </div>
                      </div>
                      <div className="w-full bg-white/30 rounded-full h-1.5">
                        <div 
                          className="gradient-secondary h-1.5 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${popularity}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        
        {/* Trainer Specialization Matrix */}
        <Card className="glass-card border-none sm:col-span-2 lg:col-span-4 hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg gradient-primary">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gradient-primary">Trainer Specialization Matrix</h3>
                <p className="text-sm text-muted-foreground">Class formats and teaching load distribution</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-96 overflow-y-auto fancy-scrollbar">
              {Object.entries(summary.classFormatsTrainer)
                .sort(([,a], [,b]) => Object.values(b).reduce((sum, count) => sum + count, 0) - Object.values(a).reduce((sum, count) => sum + count, 0))
                .map(([trainer, classes], trainerIndex) => {
                  const totalClasses = Object.values(classes).reduce((sum, count) => sum + count, 0);
                  return (
                    <div key={trainer} className="glass p-4 rounded-xl hover:bg-white/30 transition-all animate-slideUp"
                         style={{ animationDelay: `${trainerIndex * 100}ms` }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                          {trainer.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{trainer}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Activity className="w-3 h-3" />
                            <span>{totalClasses} classes</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(classes)
                          .sort(sortByCount)
                          .map(([className, count], classIndex) => (
                            <div key={className} className="flex items-center justify-between p-2 glass rounded-lg animate-slideUp"
                                 style={{ animationDelay: `${(trainerIndex * 100) + (classIndex * 50)}ms` }}>
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                                <span className="text-sm font-medium truncate">{className}</span>
                              </div>
                              <div className="px-2 py-1 gradient-secondary text-white rounded-full text-xs font-bold min-w-fit">
                                {count}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}