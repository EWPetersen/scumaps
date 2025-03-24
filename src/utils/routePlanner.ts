import { CelestialObject, Position, Route, RouteAlert, ShipSpecification } from '../models/stanton';
import { StantonSystem } from '../models/stanton';
import { calculateDistance } from './stantonParser';
import { findAlertsInRadius } from './alertUtils';

/**
 * Default quantum travel speed in m/s if not specified
 */
const DEFAULT_QUANTUM_SPEED = 200000;

/**
 * Structure for a route waypoint with safety information
 */
export interface RouteWaypoint {
  objectId: string;
  position: Position;
  distance: number; // Distance from previous waypoint
  timeFromPrevious: number; // Time in seconds from previous waypoint
  nearbyAlerts: RouteAlert[];
  safetyScore: number; // 0-100, higher is safer
}

/**
 * Route planning result
 */
export interface RoutePlan {
  startObjectId: string;
  endObjectId: string;
  waypoints: RouteWaypoint[];
  totalDistance: number;
  totalTime: number;
  fuelRequired: number;
  overallSafetyScore: number;
}

/**
 * Plan a route between two celestial objects
 * @param stantonData The Stanton system data
 * @param startObjectId ID of the starting object
 * @param endObjectId ID of the destination object
 * @param activeAlerts Active alerts in the system
 * @param ship Optional ship specifications for fuel calculations
 * @returns A planned route with waypoints and safety information
 */
export function planRoute(
  stantonData: StantonSystem,
  startObjectId: string,
  endObjectId: string,
  activeAlerts: RouteAlert[],
  ship?: ShipSpecification
): RoutePlan {
  // Get objects
  const startObject = stantonData[startObjectId];
  const endObject = stantonData[endObjectId];
  
  if (!startObject || !endObject) {
    throw new Error('Start or end object not found in Stanton data');
  }
  
  // For now, we'll do direct point-to-point routing
  // More complex routing algorithms could be implemented here
  const distance = calculateDistance(startObject.position, endObject.position);
  
  // Use ship's quantum speed or default
  const quantumSpeed = ship?.quantumSpeed || DEFAULT_QUANTUM_SPEED;
  // Time in seconds
  const time = distance / quantumSpeed;
  
  // Calculate fuel required (simple estimate based on distance and ship consumption)
  const fuelRequired = ship ? distance * ship.fuelConsumption / 1000000 : 0;
  
  // Find alerts near the route (simplified - just check start, end, and midpoint)
  const midPoint = {
    x: (startObject.position.x + endObject.position.x) / 2,
    y: (startObject.position.y + endObject.position.y) / 2,
    z: (startObject.position.z + endObject.position.z) / 2,
  };
  
  // Search for alerts within a reasonable radius (1,000,000 meters)
  const alertRadius = 1000000;
  const startAlerts = findAlertsInRadius(startObject.position, activeAlerts, alertRadius);
  const midAlerts = findAlertsInRadius(midPoint, activeAlerts, alertRadius);
  const endAlerts = findAlertsInRadius(endObject.position, activeAlerts, alertRadius);
  
  // Create waypoints (start, mid for now - could be more complex)
  const waypoints: RouteWaypoint[] = [
    {
      objectId: startObjectId,
      position: startObject.position,
      distance: 0,
      timeFromPrevious: 0,
      nearbyAlerts: startAlerts,
      safetyScore: calculateWaypointSafety(startAlerts)
    },
    {
      objectId: 'midpoint',
      position: midPoint,
      distance: distance / 2,
      timeFromPrevious: time / 2,
      nearbyAlerts: midAlerts,
      safetyScore: calculateWaypointSafety(midAlerts)
    },
    {
      objectId: endObjectId,
      position: endObject.position,
      distance: distance / 2,
      timeFromPrevious: time / 2,
      nearbyAlerts: endAlerts,
      safetyScore: calculateWaypointSafety(endAlerts)
    }
  ];
  
  // Calculate overall safety score (average of waypoints)
  const overallSafetyScore = waypoints.reduce((sum, wp) => sum + wp.safetyScore, 0) / waypoints.length;
  
  return {
    startObjectId,
    endObjectId,
    waypoints,
    totalDistance: distance,
    totalTime: time,
    fuelRequired,
    overallSafetyScore
  };
}

/**
 * Calculate safety score for a waypoint based on nearby alerts
 * @param nearbyAlerts Alerts near the waypoint
 * @returns Safety score from 0-100 (higher is safer)
 */
function calculateWaypointSafety(nearbyAlerts: RouteAlert[]): number {
  if (nearbyAlerts.length === 0) {
    return 100; // Perfectly safe if no alerts
  }
  
  // Calculate average safety score of nearby alerts
  const avgAlertSafety = nearbyAlerts.reduce((sum, alert) => sum + alert.safetyScore, 0) / nearbyAlerts.length;
  
  // More alerts = less safe
  const alertCountFactor = Math.max(0, 1 - (nearbyAlerts.length * 0.1));
  
  return avgAlertSafety * alertCountFactor;
}

/**
 * Create a saved route from a route plan
 * @param routePlan The planned route
 * @param userId The ID of the user creating the route
 * @param name Name of the route
 * @param isPublic Whether the route is public
 * @returns A route object ready to be saved
 */
export function createRoute(
  routePlan: RoutePlan,
  userId: string,
  name: string,
  isPublic = false
): Route {
  const now = Date.now();
  
  return {
    id: `route_${now}_${userId.substring(0, 8)}`,
    startPoint: routePlan.startObjectId,
    endPoint: routePlan.endObjectId,
    waypoints: routePlan.waypoints.map(wp => wp.objectId),
    distance: routePlan.totalDistance,
    estimatedTime: routePlan.totalTime,
    fuelRequired: routePlan.fuelRequired,
    alertsOnRoute: routePlan.waypoints.flatMap(wp => wp.nearbyAlerts),
    createdAt: now,
    lastUpdated: now,
    createdBy: userId,
    isPublic
  };
}

/**
 * Find alternative routes between two points to avoid dangerous areas
 * @param stantonData The Stanton system data
 * @param startObjectId ID of the starting object
 * @param endObjectId ID of the destination object
 * @param activeAlerts Active alerts in the system
 * @param maxAlternatives Maximum number of alternative routes to generate
 * @returns An array of route plans, ordered by safety (safest first)
 */
export function findAlternativeRoutes(
  stantonData: StantonSystem,
  startObjectId: string,
  endObjectId: string,
  activeAlerts: RouteAlert[],
  maxAlternatives = 3
): RoutePlan[] {
  // For now, this is a simplified implementation
  // In a real-world implementation, this would use more sophisticated algorithms
  
  // First, get the direct route
  const directRoute = planRoute(stantonData, startObjectId, endObjectId, activeAlerts);
  
  // If the route is perfectly safe, no need for alternatives
  if (directRoute.overallSafetyScore >= 90) {
    return [directRoute];
  }
  
  // Find potential waypoint objects to route through
  // Look for lagrange points, stations, or other safe points
  const waypointCandidates = Object.values(stantonData)
    .filter(obj => 
      obj.type === 'LagrangePoint' || 
      obj.type === 'Station' ||
      obj.parent === 'stantonstar' // Direct children of the star
    )
    .filter(obj => obj.name !== startObjectId && obj.name !== endObjectId);
  
  // Generate routes through these waypoints
  const alternativeRoutes: RoutePlan[] = [];
  
  for (const waypoint of waypointCandidates) {
    if (alternativeRoutes.length >= maxAlternatives) break;
    
    // Plan route from start to waypoint
    const routeToWaypoint = planRoute(
      stantonData,
      startObjectId,
      waypoint.name,
      activeAlerts
    );
    
    // Plan route from waypoint to end
    const routeFromWaypoint = planRoute(
      stantonData,
      waypoint.name,
      endObjectId,
      activeAlerts
    );
    
    // Combine the routes
    const combinedRoute: RoutePlan = {
      startObjectId,
      endObjectId,
      waypoints: [
        ...routeToWaypoint.waypoints.slice(0, -1), // Exclude the last waypoint of first route
        ...routeFromWaypoint.waypoints // Include all waypoints of second route
      ],
      totalDistance: routeToWaypoint.totalDistance + routeFromWaypoint.totalDistance,
      totalTime: routeToWaypoint.totalTime + routeFromWaypoint.totalTime,
      fuelRequired: routeToWaypoint.fuelRequired + routeFromWaypoint.fuelRequired,
      overallSafetyScore: (routeToWaypoint.overallSafetyScore + routeFromWaypoint.overallSafetyScore) / 2
    };
    
    // Only add if it's safer than the direct route
    if (combinedRoute.overallSafetyScore > directRoute.overallSafetyScore + 5) {
      alternativeRoutes.push(combinedRoute);
    }
  }
  
  // Sort routes by safety score (highest/safest first)
  const allRoutes = [directRoute, ...alternativeRoutes]
    .sort((a, b) => b.overallSafetyScore - a.overallSafetyScore);
  
  return allRoutes;
} 