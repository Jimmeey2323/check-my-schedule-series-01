import React, { useMemo, useState } from 'react';
import { ClassData } from '@/types/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Clock, 
  Users, 
  MapPin, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
  Activity,
  Zap,
  Star,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsDashboardProps {
  data: {[day: string]: ClassData[]};
  onExport?: (format: 'csv' | 'pdf' | 'json') => void;
}

interface PeakHourData {
  hour: number;
  count: number;
  utilization: number;
}

interface TrainerMetrics {
  trainer: string;
  totalClasses: number;
  uniqueLocations: number;
  averageClassesPerDay: number;
  peakDay: string;
  efficiency: number;
}

interface LocationMetrics {
  location: string;
  totalClasses: number;
  uniqueTrainers: number;
  utilizationRate: number;
  peakHours: number[];
}

export function AdvancedAnalyticsDashboard({ data, onExport }: AnalyticsDashboardProps) {
  const [activeMetric, setActiveMetric] = useState<'overview' | 'trainers' | 'locations' | 'peaks'>('overview');

  const allClasses = useMemo(() => {
    return Object.values(data).flat();
  }, [data]);

  // Peak Hours Analysis
  const peakHoursData = useMemo((): PeakHourData[] => {
    const hourCounts = new Array(24).fill(0);
    
    allClasses.forEach(cls => {
      if (cls.timeDate) {
        const hour = cls.timeDate.getHours();
        hourCounts[hour]++;
      }
    });

    const maxCount = Math.max(...hourCounts);
    
    return hourCounts.map((count, hour) => ({
      hour,
      count,
      utilization: maxCount > 0 ? (count / maxCount) * 100 : 0
    })).filter(item => item.count > 0);
  }, [allClasses]);

  // Trainer Performance Metrics
  const trainerMetrics = useMemo((): TrainerMetrics[] => {
    const trainerData = new Map<string, {
      classes: ClassData[];
      locations: Set<string>;
      dayCount: Map<string, number>;
    }>();

    allClasses.forEach(cls => {
      if (!trainerData.has(cls.trainer1)) {
        trainerData.set(cls.trainer1, {
          classes: [],
          locations: new Set(),
          dayCount: new Map()
        });
      }

      const data = trainerData.get(cls.trainer1)!;
      data.classes.push(cls);
      data.locations.add(cls.location);
      data.dayCount.set(cls.day, (data.dayCount.get(cls.day) || 0) + 1);
    });

    return Array.from(trainerData.entries()).map(([trainer, data]) => {
      const peakDay = Array.from(data.dayCount.entries()).reduce((max, current) => 
        current[1] > max[1] ? current : max
      );

      return {
        trainer,
        totalClasses: data.classes.length,
        uniqueLocations: data.locations.size,
        averageClassesPerDay: data.classes.length / data.dayCount.size,
        peakDay: peakDay[0],
        efficiency: data.locations.size > 0 ? (data.classes.length / data.locations.size) : 0
      };
    }).sort((a, b) => b.totalClasses - a.totalClasses);
  }, [allClasses]);

  // Location Utilization Metrics
  const locationMetrics = useMemo((): LocationMetrics[] => {
    const locationData = new Map<string, {
      classes: ClassData[];
      trainers: Set<string>;
      hourCounts: Map<number, number>;
    }>();

    allClasses.forEach(cls => {
      if (!locationData.has(cls.location)) {
        locationData.set(cls.location, {
          classes: [],
          trainers: new Set(),
          hourCounts: new Map()
        });
      }

      const data = locationData.get(cls.location)!;
      data.classes.push(cls);
      data.trainers.add(cls.trainer1);
      
      if (cls.timeDate) {
        const hour = cls.timeDate.getHours();
        data.hourCounts.set(hour, (data.hourCounts.get(hour) || 0) + 1);
      }
    });

    const totalClassesAcrossAllLocations = allClasses.length;

    return Array.from(locationData.entries()).map(([location, data]) => {
      const peakHours = Array.from(data.hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => hour);

      return {
        location,
        totalClasses: data.classes.length,
        uniqueTrainers: data.trainers.size,
        utilizationRate: (data.classes.length / totalClassesAcrossAllLocations) * 100,
        peakHours
      };
    }).sort((a, b) => b.totalClasses - a.totalClasses);
  }, [allClasses]);

  // Overview metrics
  const overviewMetrics = useMemo(() => {
    const totalTrainers = new Set(allClasses.map(cls => cls.trainer1)).size;
    const totalLocations = new Set(allClasses.map(cls => cls.location)).size;
    const totalDays = Object.keys(data).length;
    const avgClassesPerDay = allClasses.length / totalDays;
    
    const classesWithTime = allClasses.filter(cls => cls.timeDate).length;
    const dataQuality = (classesWithTime / allClasses.length) * 100;

    return {
      totalClasses: allClasses.length,
      totalTrainers,
      totalLocations,
      totalDays,
      avgClassesPerDay,
      dataQuality
    };
  }, [allClasses, data]);

  const getMetricTrend = (current: number, benchmark: number) => {
    const diff = ((current - benchmark) / benchmark) * 100;
    return {
      value: Math.abs(diff).toFixed(1),
      isPositive: diff > 0,
      icon: diff > 0 ? TrendingUp : TrendingDown
    };
  };

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Export Options */}
      <div className="glass-card neat-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg gradient-primary">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gradient-primary">Advanced Analytics Dashboard</h2>
              <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="neat-border">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="neat-border">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Metric Navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'trainers', label: 'Trainers', icon: Users },
            { id: 'locations', label: 'Locations', icon: MapPin },
            { id: 'peaks', label: 'Peak Hours', icon: Clock }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeMetric === id ? "default" : "outline"}
              onClick={() => setActiveMetric(id as any)}
              className={activeMetric === id ? "gradient-primary text-white" : "neat-border"}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      {activeMetric === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { 
              label: 'Total Classes', 
              value: overviewMetrics.totalClasses, 
              icon: Target, 
              color: 'text-blue-600',
              bgColor: 'bg-blue-50'
            },
            { 
              label: 'Active Trainers', 
              value: overviewMetrics.totalTrainers, 
              icon: Users, 
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-50'
            },
            { 
              label: 'Locations', 
              value: overviewMetrics.totalLocations, 
              icon: MapPin, 
              color: 'text-purple-600',
              bgColor: 'bg-purple-50'
            },
            { 
              label: 'Active Days', 
              value: overviewMetrics.totalDays, 
              icon: Calendar, 
              color: 'text-orange-600',
              bgColor: 'bg-orange-50'
            },
            { 
              label: 'Avg/Day', 
              value: overviewMetrics.avgClassesPerDay.toFixed(1), 
              icon: TrendingUp, 
              color: 'text-teal-600',
              bgColor: 'bg-teal-50'
            },
            { 
              label: 'Data Quality', 
              value: `${overviewMetrics.dataQuality.toFixed(0)}%`, 
              icon: CheckCircle, 
              color: 'text-green-600',
              bgColor: 'bg-green-50'
            }
          ].map((metric, index) => (
            <Card key={metric.label} className="glass-card neat-border animate-slideUp" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-4 text-center">
                <div className={`p-3 rounded-lg ${metric.bgColor} mx-auto mb-3 w-fit`}>
                  <metric.icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold text-gradient-secondary mb-1">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trainer Metrics */}
      {activeMetric === 'trainers' && (
        <div className="space-y-4">
          <Card className="glass-card neat-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Trainer Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainerMetrics.slice(0, 10).map((trainer, index) => (
                  <div 
                    key={trainer.trainer}
                    className="flex items-center justify-between p-4 glass neat-border rounded-lg animate-slideUp"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                        {trainer.trainer.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gradient-primary">{trainer.trainer}</div>
                        <div className="text-sm text-muted-foreground">
                          Peak day: {trainer.peakDay}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div className="text-xl font-bold text-gradient-secondary">{trainer.totalClasses}</div>
                        <div className="text-xs text-muted-foreground">Classes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gradient-secondary">{trainer.uniqueLocations}</div>
                        <div className="text-xs text-muted-foreground">Locations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gradient-secondary">{trainer.averageClassesPerDay.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg/Day</div>
                      </div>
                      <Badge 
                        variant={trainer.efficiency > 5 ? "default" : "secondary"}
                        className={trainer.efficiency > 5 ? "gradient-primary text-white" : ""}
                      >
                        {trainer.efficiency > 5 ? <Star className="h-3 w-3 mr-1" /> : null}
                        {trainer.efficiency.toFixed(1)} Efficiency
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Location Metrics */}
      {activeMetric === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locationMetrics.map((location, index) => (
            <Card key={location.location} className="glass-card neat-border animate-slideUp" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-600" />
                    {location.location}
                  </div>
                  <Badge variant="outline" className="neat-border">
                    {location.utilizationRate.toFixed(1)}% Utilization
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gradient-secondary">{location.totalClasses}</div>
                    <div className="text-sm text-muted-foreground">Total Classes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gradient-secondary">{location.uniqueTrainers}</div>
                    <div className="text-sm text-muted-foreground">Trainers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gradient-secondary">{location.peakHours.length}</div>
                    <div className="text-sm text-muted-foreground">Peak Hours</div>
                  </div>
                </div>
                
                {location.peakHours.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Peak Hours:</div>
                    <div className="flex gap-2">
                      {location.peakHours.map(hour => (
                        <Badge key={hour} variant="secondary" className="neat-border">
                          {formatHour(hour)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Peak Hours Analysis */}
      {activeMetric === 'peaks' && (
        <Card className="glass-card neat-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Hours Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {peakHoursData.sort((a, b) => b.count - a.count).map((peak, index) => (
                <div 
                  key={peak.hour}
                  className="flex items-center gap-4 p-3 glass neat-border rounded-lg animate-slideUp"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="text-lg font-bold text-gradient-primary min-w-[80px]">
                    {formatHour(peak.hour)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{peak.count} classes</span>
                      <span className="text-sm text-muted-foreground">{peak.utilization.toFixed(0)}% of peak</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="gradient-primary h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${peak.utilization}%` }}
                      />
                    </div>
                  </div>
                  {index < 3 && (
                    <Badge className="gradient-primary text-white">
                      Top {index + 1}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}