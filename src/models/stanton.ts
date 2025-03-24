// Core positional interfaces
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface OrbitalMarker {
  x: number;
  y: number;
  z: number;
}

export interface OrbitalMarkers {
  om1: Position;
  om2: Position;
  om3: Position;
  om4: Position;
  om5: Position;
  om6: Position;
}

// Base celestial object interface (common properties)
export interface BaseCelestialObject {
  arrivalRadius: number;
  atmoHeight: number;
  display_name: string;
  name: string;
  obstructionRadius: number;
  parent: string;
  position: Position;
  rotation: Rotation;
  size: number;
  system_entity_name: string;
  type: CelestialObjectType;
}

// All possible celestial object types
export type CelestialObjectType = 
  | 'Star' 
  | 'Planet' 
  | 'Moon' 
  | 'JumpPoint' 
  | 'LagrangePoint' 
  | 'Station' 
  | 'CommArray' 
  | 'LandingZone';

// Specialized interfaces for each type
export interface Star extends BaseCelestialObject {
  type: 'Star';
}

export interface Planet extends BaseCelestialObject {
  type: 'Planet';
  orbitalMarkers: OrbitalMarkers;
}

export interface Moon extends BaseCelestialObject {
  type: 'Moon';
  orbitalMarkers?: OrbitalMarkers;
}

export interface JumpPoint extends BaseCelestialObject {
  type: 'JumpPoint';
}

export interface LagrangePoint extends BaseCelestialObject {
  type: 'LagrangePoint';
}

export interface Station extends BaseCelestialObject {
  type: 'Station';
}

export interface CommArray extends BaseCelestialObject {
  type: 'CommArray';
}

export interface LandingZone extends BaseCelestialObject {
  type: 'LandingZone';
}

// Union type for all celestial objects
export type CelestialObject = 
  | Star 
  | Planet 
  | Moon 
  | JumpPoint 
  | LagrangePoint 
  | Station 
  | CommArray 
  | LandingZone;

// Interface for the entire Stanton system data
export interface StantonSystem {
  [key: string]: CelestialObject;
}

// Route alert interfaces as specified in the requirements
export interface RouteAlert {
  id: string;
  location: {
    position: Position;
    regionId: string;
  };
  alertType: AlertType;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  confirmations: number;
  disputes: number;
  shardId: string;
  safetyScore: number;
}

export type AlertType = 
  | 'pirate' 
  | 'security' 
  | 'debris' 
  | 'anomaly' 
  | 'trade';

// User profile interface
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: number;
  lastActive: number;
  reputation: number;
  subscription: SubscriptionStatus;
  settings: UserSettings;
  reportedAlerts: string[]; // Array of alert IDs reported by the user
}

export type SubscriptionStatus = 
  | 'free' 
  | 'premium' 
  | 'enterprise';

export interface UserSettings {
  darkMode: boolean;
  showAllAlerts: boolean;
  alertNotifications: boolean;
  defaultShip?: string;
}

// Ship specifications for route planning
export interface ShipSpecification {
  id: string;
  name: string;
  manufacturer: string;
  size: number;
  fuelCapacity: number;
  fuelConsumption: number;
  quantumSpeed: number;
  scmSpeed: number;
  cargoCapacity: number;
}

// Route planning interface
export interface Route {
  id: string;
  startPoint: string; // ID of the start location
  endPoint: string; // ID of the end location
  waypoints: string[]; // Array of waypoint IDs
  distance: number;
  estimatedTime: number;
  fuelRequired: number;
  alertsOnRoute: RouteAlert[];
  createdAt: number;
  lastUpdated: number;
  createdBy: string;
  isPublic: boolean;
}

// AI prediction data structures
export interface AlertPrediction {
  regionId: string;
  probability: number;
  alertType: AlertType;
  confidence: number;
  predictedAt: number;
  basedOnHistorical: boolean;
}

// Helper function to type-check a celestial object 
export function isCelestialObject(obj: any): obj is CelestialObject {
  return obj && 
    typeof obj === 'object' && 
    'type' in obj && 
    [
      'Star',
      'Planet',
      'Moon',
      'JumpPoint',
      'LagrangePoint',
      'Station',
      'CommArray',
      'LandingZone'
    ].includes(obj.type);
} 