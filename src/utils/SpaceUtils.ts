import { Position, Rotation, DistanceUnit, CelestialObject } from '../models/StarSystemTypes';

/**
 * Convert a distance value from one unit to another
 * 1 unit = 1 Gm (gigameter) scale
 */
export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  // Convert to Gm first (base unit)
  let inGm = value;
  
  if (from === DistanceUnit.Kilometer) {
    inGm = value / 1_000_000; // 1 Gm = 1,000,000 km
  } else if (from === DistanceUnit.AstronomicalUnit) {
    inGm = value * 149.6; // 1 AU ≈ 149.6 Gm
  }
  
  // Convert from Gm to target unit
  if (to === DistanceUnit.Gigameter) {
    return inGm;
  } else if (to === DistanceUnit.Kilometer) {
    return inGm * 1_000_000;
  } else if (to === DistanceUnit.AstronomicalUnit) {
    return inGm / 149.6;
  }
  
  return inGm; // Default return in Gm
}

/**
 * Calculate the absolute position of an object based on its parent's position
 */
export function calculateAbsolutePosition(object: CelestialObject, parentPosition: Position): Position {
  return {
    x: parentPosition.x + object.position.x,
    y: parentPosition.y + object.position.y,
    z: parentPosition.z + object.position.z
  };
}

/**
 * Calculate distance between two positions in 3D space
 */
export function calculateDistance(posA: Position, posB: Position): number {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const dz = posB.z - posA.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Generate points for an orbit path based on the object's position relative to its parent
 * This creates a simple circular orbit path using the distance from parent as radius
 */
export function generateOrbitPath(object: CelestialObject, steps = 100): Position[] {
  const radius = Math.sqrt(
    object.position.x * object.position.x + 
    object.position.y * object.position.y + 
    object.position.z * object.position.z
  );
  
  // Determine orbit plane normal vector
  // Using cross product of position and an arbitrary vector (often up vector [0,1,0])
  const positionMagnitude = Math.sqrt(
    object.position.x * object.position.x + 
    object.position.y * object.position.y + 
    object.position.z * object.position.z
  );
  
  // Normalize position vector
  const posNorm = {
    x: object.position.x / positionMagnitude,
    y: object.position.y / positionMagnitude,
    z: object.position.z / positionMagnitude
  };
  
  // Find a perpendicular vector
  // First try using a common up vector
  let perpVector = { x: 0, y: 1, z: 0 };
  
  // If position is too close to the up vector, use another reference
  if (Math.abs(posNorm.y) > 0.9) {
    perpVector = { x: 1, y: 0, z: 0 };
  }
  
  // Cross product to find first basis vector for the orbit plane
  const v1 = {
    x: posNorm.y * perpVector.z - posNorm.z * perpVector.y,
    y: posNorm.z * perpVector.x - posNorm.x * perpVector.z,
    z: posNorm.x * perpVector.y - posNorm.y * perpVector.x
  };
  
  // Normalize v1
  const v1Mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const v1Norm = {
    x: v1.x / v1Mag,
    y: v1.y / v1Mag,
    z: v1.z / v1Mag
  };
  
  // Cross product of position and v1 to get second basis vector
  const v2 = {
    x: posNorm.y * v1Norm.z - posNorm.z * v1Norm.y,
    y: posNorm.z * v1Norm.x - posNorm.x * v1Norm.z,
    z: posNorm.x * v1Norm.y - posNorm.y * v1Norm.x
  };
  
  // Normalize v2
  const v2Mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  const v2Norm = {
    x: v2.x / v2Mag,
    y: v2.y / v2Mag,
    z: v2.z / v2Mag
  };
  
  const orbitPoints: Position[] = [];
  
  // Generate points around the orbit
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = radius * Math.cos(angle) * v1Norm.x + radius * Math.sin(angle) * v2Norm.x;
    const y = radius * Math.cos(angle) * v1Norm.y + radius * Math.sin(angle) * v2Norm.y;
    const z = radius * Math.cos(angle) * v1Norm.z + radius * Math.sin(angle) * v2Norm.z;
    
    orbitPoints.push({ x, y, z });
  }
  
  return orbitPoints;
}

/**
 * Quaternion to Euler angles conversion
 * This is useful for visualizing the rotation
 */
export function quaternionToEuler(rotation: Rotation): { x: number; y: number; z: number } {
  // Implementation of quaternion to Euler angles conversion
  // Based on three.js implementation
  const { x, y, z, w } = rotation;
  
  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);
  
  // Pitch (y-axis rotation)
  const sinp = 2 * (w * y - z * x);
  let pitch;
  if (Math.abs(sinp) >= 1) {
    // Use 90 degrees if out of range
    pitch = (Math.PI / 2) * Math.sign(sinp);
  } else {
    pitch = Math.asin(sinp);
  }
  
  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);
  
  return { x: roll, y: pitch, z: yaw };
} 