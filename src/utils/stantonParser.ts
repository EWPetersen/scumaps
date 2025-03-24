import { CelestialObject, StantonSystem, isCelestialObject } from '../models/stanton';

/**
 * Loads and parses the Stanton system data
 * @returns The parsed Stanton system data
 */
export async function loadStantonSystem(): Promise<StantonSystem> {
  try {
    const response = await fetch('/stanton_extract.json');
    if (!response.ok) {
      throw new Error(`Failed to load Stanton system data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return validateStantonData(data);
  } catch (error) {
    console.error('Error loading Stanton system data:', error);
    throw error;
  }
}

/**
 * Validates the Stanton system data structure
 * @param data The data to validate
 * @returns The validated Stanton system data
 */
function validateStantonData(data: any): StantonSystem {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid Stanton system data: not an object');
  }

  // Check if all entries are valid celestial objects
  const invalidEntries = Object.entries(data)
    .filter(([_, value]) => !isCelestialObject(value))
    .map(([key]) => key);

  if (invalidEntries.length > 0) {
    console.warn(`Found invalid celestial objects: ${invalidEntries.join(', ')}`);
  }

  return data as StantonSystem;
}

/**
 * Get all celestial objects of a specific type
 * @param data The Stanton system data
 * @param type The type of celestial object to filter by
 * @returns An array of celestial objects of the specified type
 */
export function getCelestialObjectsByType<T extends CelestialObject>(
  data: StantonSystem,
  type: T['type']
): T[] {
  return Object.values(data)
    .filter((obj): obj is T => obj.type === type) as T[];
}

/**
 * Get a celestial object by its ID (key)
 * @param data The Stanton system data
 * @param id The ID of the celestial object
 * @returns The celestial object with the given ID, or undefined if not found
 */
export function getCelestialObjectById(
  data: StantonSystem,
  id: string
): CelestialObject | undefined {
  return data[id];
}

/**
 * Get all child objects of a parent object
 * @param data The Stanton system data
 * @param parentId The ID of the parent object
 * @returns An array of child celestial objects
 */
export function getChildObjects(
  data: StantonSystem,
  parentId: string
): CelestialObject[] {
  return Object.values(data)
    .filter(obj => obj.parent === parentId);
}

/**
 * Build a hierarchical tree of the Stanton system
 * @param data The Stanton system data
 * @returns A hierarchical tree representation of the Stanton system
 */
export function buildStantonTree(data: StantonSystem): StantonTreeNode {
  // Find the root node (star)
  const star = Object.values(data).find(obj => obj.type === 'Star');
  if (!star) {
    throw new Error('Star not found in Stanton system data');
  }

  return buildTreeNode(data, star.name);
}

interface StantonTreeNode {
  object: CelestialObject;
  children: StantonTreeNode[];
}

/**
 * Build a tree node for the hierarchical representation
 * @param data The Stanton system data
 * @param nodeId The ID of the node to build
 * @returns A tree node with its children
 */
function buildTreeNode(data: StantonSystem, nodeId: string): StantonTreeNode {
  const object = data[nodeId];
  if (!object) {
    throw new Error(`Object with ID ${nodeId} not found`);
  }

  const children = getChildObjects(data, nodeId)
    .map(child => buildTreeNode(data, child.name));

  return {
    object,
    children
  };
}

/**
 * Calculate the distance between two positions
 * @param pos1 The first position
 * @param pos2 The second position
 * @returns The distance between the two positions
 */
export function calculateDistance(pos1: { x: number; y: number; z: number }, 
                                  pos2: { x: number; y: number; z: number }): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
} 