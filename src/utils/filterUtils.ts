
import { FilterState } from '@/types/schedule';

interface FilterableItem {
  day: string;
  location: string;
  trainer: string;
  className: string;
}

export function passesFilters(item: FilterableItem, filters: FilterState): boolean {
  // If a filter array is empty, it means no filtering for that property
  // If a filter array has values, item property must match one of them
  
  if (filters.day.length > 0 && !filters.day.includes(item.day)) return false;
  if (filters.location.length > 0 && !filters.location.includes(item.location)) return false;
  if (filters.trainer.length > 0 && !filters.trainer.includes(item.trainer)) return false;
  if (filters.className.length > 0 && !filters.className.includes(item.className)) return false;
  
  return true;
}
