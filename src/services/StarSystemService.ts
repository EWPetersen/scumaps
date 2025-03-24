import { CelestialObject, Position, ObjectType, StarSystem } from '../models/StarSystemTypes';
import { calculateAbsolutePosition, generateOrbitPath } from '../utils/SpaceUtils';

export class StarSystemService {
  private systemData: Record<string, any> | null = null;
  private starSystem: StarSystem | null = null;
  private objectsById = new Map<string, CelestialObject>();
  private objectsByType = new Map<ObjectType, CelestialObject[]>();
  private objectsByParent = new Map<string, CelestialObject[]>();
  private starPosition: Position = { x: 0, y: 0, z: 0 }; // Origin for the star

  /**
   * Load and parse the star system data from a JSON file
   */
  public async loadFromFile(path: string): Promise<StarSystem> {
    try {
      console.log(`Attempting to load data from: ${path}`);
      const response = await fetch(path);
      
      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`);
        throw new Error(`Failed to load system data: ${response.status} ${response.statusText}`);
      }
      
      // Check content type to help diagnose issues
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        console.warn(`Warning: Expected JSON but got ${contentType}`);
      }
      
      // Get the response text first to help debug
      const text = await response.text();
      
      try {
        // Try to parse the text as JSON
        this.systemData = JSON.parse(text);
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        // Show a preview of the text to help diagnose
        console.error('Response text preview:', text.substring(0, 100) + '...');
        throw new Error(`Invalid JSON: ${parseError.message}`);
      }
      
      return this.processSystemData();
    } catch (error) {
      console.error("Error loading star system data:", error);
      throw error;
    }
  }

  /**
   * Load system data directly from a provided object (e.g., imported JSON)
   */
  public loadFromObject(data: Record<string, any>): StarSystem {
    try {
      console.log('Loading system data from object');
      this.systemData = data;
      return this.processSystemData();
    } catch (error) {
      console.error("Error processing system data:", error);
      throw error;
    }
  }

  /**
   * Process the loaded JSON data and build the object hierarchies
   */
  private processSystemData(): StarSystem {
    if (!this.systemData) {
      throw new Error("System data not loaded");
    }

    // Reset collections
    this.objectsById.clear();
    this.objectsByType.clear();
    this.objectsByParent.clear();

    // Create the inferred Lagrange points and planets if needed
    this.createInferredObjects();

    // First pass: create all objects and index them
    for (const [id, data] of Object.entries(this.systemData)) {
      const celestialObject = this.createCelestialObject(id, data);
      this.objectsById.set(id, celestialObject);
      
      // Index by type
      const objectsOfType = this.objectsByType.get(celestialObject.type) || [];
      objectsOfType.push(celestialObject);
      this.objectsByType.set(celestialObject.type, objectsOfType);
      
      // Index by parent
      const parent = celestialObject.parent;
      const objectsWithParent = this.objectsByParent.get(parent) || [];
      objectsWithParent.push(celestialObject);
      this.objectsByParent.set(parent, objectsWithParent);
    }

    // Fix missing parent-child relationships
    this.fixParentChildRelationships();

    // Find the star (usually named 'stantonstar' for Stanton system)
    const star = this.findStar();
    if (!star) {
      throw new Error("Star not found in the system data");
    }

    // Create the star system object
    this.starSystem = {
      name: "Stanton",
      star: star as any, // Type assertion as Star
      children: new Map(),
      objectsById: this.objectsById,
      objectsByType: this.objectsByType
    };

    // Build hierarchical relationships
    this.buildHierarchy();

    return this.starSystem;
  }

  /**
   * Create inferred objects like Lagrange points that might be referenced but not defined
   */
  private createInferredObjects(): void {
    if (!this.systemData) return;

    // Scan for patterns in the data that suggest missing objects
    // For example, if a station references a lagrange point that doesn't exist
    const lagrangePointPattern = /stanton(\d+)_l(\d+)/;
    const inferredObjects: Record<string, any> = {};
    
    // First identify all the parents referenced in the data
    const referencedParents = new Set<string>();
    
    for (const data of Object.values(this.systemData)) {
      if (data.parent) {
        referencedParents.add(data.parent);
      }
    }
    
    // Check if any referenced parent isn't defined
    for (const parentId of referencedParents) {
      if (!this.systemData[parentId]) {
        // Check if it's a lagrange point
        const match = parentId.match(lagrangePointPattern);
        if (match) {
          const planetNumber = match[1];
          const lagrangeNumber = match[2];
          const planetId = `stanton${planetNumber}`;
          
          // Create an inferred lagrange point
          inferredObjects[parentId] = {
            arrivalRadius: 1000.0,
            atmoHeight: 0.0,
            display_name: `L${lagrangeNumber}`,
            name: parentId,
            obstructionRadius: 0.0,
            parent: planetId,
            position: { x: 0, y: 0, z: 0 }, // Placeholder position
            rotation: { w: 1, x: 0, y: 0, z: 0 },
            size: 1000.0,
            system_entity_name: `Inferred_${parentId}`,
            type: "LagrangePoint"
          };
          
          console.log(`Created inferred Lagrange point: ${parentId}`);
        }
      }
    }
    
    // Add the inferred objects to the system data
    for (const [id, data] of Object.entries(inferredObjects)) {
      this.systemData[id] = data;
    }
  }

  /**
   * Fix parent-child relationships where objects reference non-existent parents
   */
  private fixParentChildRelationships(): void {
    if (!this.systemData) return;
    
    const knownObjectIds = new Set(Object.keys(this.systemData));
    
    // Fix the star if it has 'root' as parent
    const starKey = Object.keys(this.systemData).find(key => 
      key.toLowerCase().includes('star') || key.toLowerCase().includes('sun')
    );
    
    if (starKey && this.systemData[starKey].parent === 'root') {
      this.systemData[starKey].parent = ''; // Set to empty string to indicate no parent
    }
    
    // Check each object's parent and fix if needed
    for (const [id, data] of Object.entries(this.systemData)) {
      if (data.parent && !knownObjectIds.has(data.parent)) {
        // Try to find a suitable parent
        
        // For lagrange points, check if a planet exists
        if (id.includes('_l') && id.includes('stanton')) {
          const planetPattern = /stanton(\d+)_l\d+/;
          const match = id.match(planetPattern);
          if (match) {
            const planetId = `stanton${match[1]}`;
            if (knownObjectIds.has(planetId)) {
              console.log(`Fixing parent for ${id}: ${data.parent} -> ${planetId}`);
              data.parent = planetId;
            } else {
              // No suitable parent found, associate with the star
              data.parent = starKey || '';
            }
          }
        } 
        // For stations at a lagrange point, associate them with the correct planet
        else if (id.includes('station_reststop') && id.includes('stanton')) {
          const planetPattern = /stanton(\d+)_l\d+/;
          const match = data.parent.match(planetPattern);
          if (match) {
            const planetId = `stanton${match[1]}`;
            if (knownObjectIds.has(planetId)) {
              console.log(`Fixing parent for ${id}: ${data.parent} -> ${planetId}`);
              data.parent = planetId;
            } else {
              // No suitable parent found, associate with the star
              data.parent = starKey || '';
            }
          }
        }
        // Default case - associate directly with the star
        else {
          data.parent = starKey || '';
        }
      }
    }
  }

  /**
   * Create a celestial object from raw JSON data
   */
  private createCelestialObject(id: string, data: any): CelestialObject {
    // Determine object type based on the data or id
    let type: ObjectType;
    if (id.toLowerCase().includes('jumppoint')) {
      type = ObjectType.JumpPoint;
    } else if (id.toLowerCase().includes('lagrange')) {
      type = ObjectType.LagrangePoint;
    } else if (id.toLowerCase().includes('commarray')) {
      type = ObjectType.CommArray;
    } else if (id.toLowerCase().includes('star')) {
      type = ObjectType.Star;
    } else if (id.toLowerCase().includes('planet') || (data.type && data.type === 'Planet')) {
      type = ObjectType.Planet;
    } else if (id.toLowerCase().includes('moon') || (data.type && data.type === 'Moon')) {
      type = ObjectType.Moon;
    } else if (id.toLowerCase().includes('station') || (data.type && data.type === 'Station')) {
      type = ObjectType.Station;
    } else if (id.toLowerCase().includes('outpost') || (data.type && data.type === 'Outpost')) {
      type = ObjectType.Outpost;
    } else if (id.toLowerCase().includes('reststop') || (data.type && data.type === 'RestStop')) {
      type = ObjectType.RestStop;
    } else if (id.toLowerCase().includes('landingzone') || (data.type && data.type === 'LandingZone')) {
      type = ObjectType.LandingZone;
    } else if (id.toLowerCase().includes('orbitmarker') || (data.type && data.type === 'OrbitMarker')) {
      type = ObjectType.OrbitMarker;
    } else {
      // If no specific type identified, use the type from data or default to Generic
      type = (data.type as ObjectType) || ObjectType.Generic;
    }

    // Create and return the celestial object
    return {
      name: id,
      display_name: data.display_name || id,
      parent: data.parent || "",
      type,
      position: data.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation || { w: 1, x: 0, y: 0, z: 0 },
      size: data.size || 0,
      arrivalRadius: data.arrivalRadius || 0,
      obstructionRadius: data.obstructionRadius || 0,
      atmoHeight: data.atmoHeight || 0,
      system_entity_name: data.system_entity_name || id
    };
  }

  /**
   * Find the star in the system
   */
  private findStar(): CelestialObject | null {
    // First try to find objects of type Star
    const stars = this.objectsByType.get(ObjectType.Star);
    if (stars && stars.length > 0) {
      return stars[0];
    }

    // Alternatively, look for an object with 'star' in its ID
    for (const [id, object] of this.objectsById.entries()) {
      if (id.toLowerCase().includes('star')) {
        return object;
      }
    }

    // If no star is found by ID, try to find an object without a parent
    // (which is likely to be the star at the center)
    for (const object of this.objectsById.values()) {
      if (!object.parent || object.parent === "") {
        return object;
      }
    }

    return null;
  }

  /**
   * Build the hierarchical relationship between objects
   */
  private buildHierarchy(): void {
    if (!this.starSystem) return;

    // Start from the star and build the hierarchy
    const processChildren = (parentId: string, parentPosition: Position) => {
      const children = this.objectsByParent.get(parentId) || [];
      
      for (const child of children) {
        // Calculate absolute position based on parent
        const absolutePosition = calculateAbsolutePosition(child, parentPosition);
        
        // Recursively process this child's children
        processChildren(child.name, absolutePosition);
      }
    };

    // Start processing from the star
    processChildren(this.starSystem.star.name, this.starPosition);
  }

  /**
   * Get objects by their type
   */
  public getObjectsByType(type: ObjectType): CelestialObject[] {
    return this.objectsByType.get(type) || [];
  }

  /**
   * Get an object by its ID
   */
  public getObjectById(id: string): CelestialObject | undefined {
    return this.objectsById.get(id);
  }

  /**
   * Get children of a specific parent
   */
  public getChildrenOfObject(parentId: string): CelestialObject[] {
    return this.objectsByParent.get(parentId) || [];
  }

  /**
   * Get orbit path for an object
   */
  public getOrbitPath(objectId: string, steps = 100): Position[] {
    const object = this.objectsById.get(objectId);
    if (!object) {
      return [];
    }
    
    return generateOrbitPath(object, steps);
  }

  /**
   * Calculate absolute position for an object
   */
  public getAbsolutePosition(objectId: string): Position | null {
    const object = this.objectsById.get(objectId);
    if (!object) {
      return null;
    }
    
    // Start with the object's own position
    let position = { ...object.position };
    
    // Traverse up the parent chain to calculate absolute position
    let currentObject = object;
    let parentId = currentObject.parent;
    
    while (parentId && parentId !== "") {
      const parent = this.objectsById.get(parentId);
      if (!parent) break;
      
      // Add parent's position to get absolute position
      position = {
        x: position.x + parent.position.x,
        y: position.y + parent.position.y,
        z: position.z + parent.position.z
      };
      
      // Move up to the next parent
      parentId = parent.parent;
    }
    
    return position;
  }

  /**
   * Get statistics about the loaded data
   */
  public getStatistics(): Record<string, any> {
    if (!this.starSystem) {
      return { loaded: false };
    }
    
    const typeStats: Record<string, number> = {};
    
    // Count objects by type
    for (const [type, objects] of this.objectsByType.entries()) {
      typeStats[type] = objects.length;
    }
    
    return {
      loaded: true,
      objectCount: this.objectsById.size,
      typeStats,
      parentCount: this.objectsByParent.size
    };
  }
}

// Create a singleton instance for easy import
export const starSystemService = new StarSystemService(); 