import { Location } from "./geocoding";

export interface OptimizedStop extends Location {
  estimatedArrivalTime?: string;
  distanceFromPrevious?: number; // in km
}

// Haversine formula to calculate distance between two points
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function optimizeRoute(start: Location, stops: Location[]): OptimizedStop[] {
  const unvisited = [...stops];
  const optimized: OptimizedStop[] = [];
  let currentPos = start;
  let currentTime = new Date();

  // Average speed in km/h (considering traffic/urban)
  const averageSpeed = 30; 
  // Average time spent at each stop in minutes
  const stopDuration = 10;

  while (unvisited.length > 0) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = getDistance(currentPos.lat, currentPos.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStop = unvisited.splice(nearestIndex, 1)[0];
    
    // Calculate travel time in minutes
    const travelTimeMinutes = (minDistance / averageSpeed) * 60;
    
    // Update current time
    currentTime = new Date(currentTime.getTime() + travelTimeMinutes * 60000);
    
    optimized.push({
      ...nextStop,
      distanceFromPrevious: minDistance,
      estimatedArrivalTime: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // Add stop duration for next leg
    currentTime = new Date(currentTime.getTime() + stopDuration * 60000);
    currentPos = nextStop;
  }

  return optimized;
}
