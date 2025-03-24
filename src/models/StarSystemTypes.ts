// Base interface for all celestial objects
export interface CelestialObject {
  name: string;
  display_name: string;
  parent: string;
  type: ObjectType;
  position: Position;
  rotation: Rotation;
  size: number;
  arrivalRadius: number;
  obstructionRadius: number;
  atmoHeight: number;
  system_entity_name: string;
}

// Position coordinates
export interface Position {
  x: number;
  y: number;
  z: number;
}

// Rotation quaternion
export interface Rotation {
  w: number;
  x: number;
  y: number;
  z: number;
}

// Types of celestial objects
export enum ObjectType {
  Star = "Star",
  Planet = "Planet",
  Moon = "Moon",
  JumpPoint = "JumpPoint",
  LagrangePoint = "LagrangePoint",
  Station = "Station",
  SpaceStation = "SpaceStation",
  Outpost = "Outpost",
  LandingZone = "LandingZone",
  CommArray = "CommArray",
  RestStop = "RestStop",
  OrbitMarker = "OrbitMarker",
  Generic = "Generic",
}

// Star specific properties
export interface Star extends CelestialObject {
  type: ObjectType.Star;
  // Add any star-specific properties here
}

// Planet specific properties
export interface Planet extends CelestialObject {
  type: ObjectType.Planet;
  // Additional planet-specific properties
  atmosphericHeight?: number;
  orbitMarkers?: OrbitMarker[];
}

// Moon specific properties
export interface Moon extends CelestialObject {
  type: ObjectType.Moon;
  // Additional moon-specific properties
}

// Jump Point specific properties
export interface JumpPoint extends CelestialObject {
  type: ObjectType.JumpPoint;
  // Additional jump point specific properties
}

// Lagrange Point specific properties
export interface LagrangePoint extends CelestialObject {
  type: ObjectType.LagrangePoint;
  // Additional lagrange point specific properties
}

// Station specific properties
export interface Station extends CelestialObject {
  type: ObjectType.Station | ObjectType.SpaceStation | ObjectType.RestStop | ObjectType.Outpost;
  // Additional station specific properties
}

// Landing Zone specific properties
export interface LandingZone extends CelestialObject {
  type: ObjectType.LandingZone;
  // Additional landing zone specific properties
}

// Comm Array specific properties
export interface CommArray extends CelestialObject {
  type: ObjectType.CommArray;
  // Additional comm array specific properties
}

// Orbit Marker specific properties
export interface OrbitMarker extends CelestialObject {
  type: ObjectType.OrbitMarker;
  // Additional orbit marker specific properties
}

// Complete star system structure with hierarchical relationships
export interface StarSystem {
  name: string;
  star: Star;
  children: Map<string, CelestialObject>;
  objectsById: Map<string, CelestialObject>;
  objectsByType: Map<ObjectType, CelestialObject[]>;
}

// Distance units for conversion
export enum DistanceUnit {
  Kilometer = "km",
  Gigameter = "Gm",
  AstronomicalUnit = "AU",
} 