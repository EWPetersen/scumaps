import { CelestialObject, ObjectType, StarSystem } from '../models/StarSystemTypes';
import { starSystemService } from '../services/StarSystemService';

/**
 * Utility for debugging and validating the star system data
 */
export class SystemDebugger {
  private starSystem: StarSystem | null = null;
  
  /**
   * Set the star system to debug
   */
  public setStarSystem(starSystem: StarSystem): void {
    this.starSystem = starSystem;
  }
  
  /**
   * Generate a text representation of the hierarchical structure
   */
  public generateHierarchyText(): string {
    if (!this.starSystem) {
      return "No star system loaded";
    }
    
    let result = `Star System: ${this.starSystem.name}\n`;
    result += this.generateObjectHierarchy(this.starSystem.star, 0);
    
    return result;
  }
  
  /**
   * Generate a hierarchical representation of an object and its children
   */
  private generateObjectHierarchy(object: CelestialObject, depth: number): string {
    const indent = "  ".repeat(depth);
    let result = `${indent}${object.display_name} (${object.type})\n`;
    
    // Get children of this object
    const children = starSystemService.getChildrenOfObject(object.name);
    
    // Sort children by type and then by name
    children.sort((a, b) => {
      // First sort by type priority
      const typePriority: Record<ObjectType, number> = {
        [ObjectType.Planet]: 1,
        [ObjectType.Moon]: 2,
        [ObjectType.LagrangePoint]: 3,
        [ObjectType.JumpPoint]: 4,
        [ObjectType.Station]: 5,
        [ObjectType.SpaceStation]: 6,
        [ObjectType.RestStop]: 7,
        [ObjectType.Outpost]: 8,
        [ObjectType.LandingZone]: 9,
        [ObjectType.CommArray]: 10,
        [ObjectType.OrbitMarker]: 11,
        [ObjectType.Generic]: 12,
        [ObjectType.Star]: 0
      };
      
      const priorityDiff = (typePriority[a.type] || 999) - (typePriority[b.type] || 999);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by name
      return a.display_name.localeCompare(b.display_name);
    });
    
    // Recursively add children
    for (const child of children) {
      result += this.generateObjectHierarchy(child, depth + 1);
    }
    
    return result;
  }
  
  /**
   * Validate the loaded data for consistency and completeness
   */
  public validateData(): { valid: boolean; issues: string[] } {
    if (!this.starSystem) {
      return { valid: false, issues: ["No star system loaded"] };
    }
    
    const issues: string[] = [];
    const ignoredParentWarnings = new Set<string>();
    
    // Check that we have a star
    if (!this.starSystem.star) {
      issues.push("No star found in the system");
    } else {
      // For the star, it's okay if it has "root" as parent or no parent
      if (this.starSystem.star.parent === "root") {
        ignoredParentWarnings.add(this.starSystem.star.name);
      }
    }
    
    // Create a set of known object IDs for quick lookups
    const knownObjectIds = new Set<string>(
      Array.from(this.starSystem.objectsById.keys())
    );
    
    // Also check for Lagrange points specifically, as they're often referenced but might be missing
    const lagrangePointPattern = /stanton\d+_l\d+/;
    
    // Check all objects have parents except the star
    for (const object of this.starSystem.objectsById.values()) {
      // Skip the star, it might not have a parent or have "root" as parent
      if (object.type === ObjectType.Star) {
        continue;
      }
      
      // Check if parent exists
      if (object.parent && object.parent !== "") {
        const parentExists = knownObjectIds.has(object.parent);
        
        // If the parent doesn't exist but it's a lagrange point ID, we'll ignore this warning
        // as lagrange points are often referenced in REST stop IDs
        if (!parentExists && lagrangePointPattern.test(object.parent)) {
          ignoredParentWarnings.add(object.name);
          continue;
        }
        
        // If the parent doesn't exist and we're not ignoring this warning
        if (!parentExists && !ignoredParentWarnings.has(object.name)) {
          issues.push(`Object ${object.display_name} (${object.name}) has non-existent parent: ${object.parent}`);
        }
      } else if (!ignoredParentWarnings.has(object.name)) {
        // Object has no parent and it's not in our ignore list
        issues.push(`Object ${object.display_name} (${object.name}) has no parent`);
      }
    }
    
    // Check for consistent position data
    for (const object of this.starSystem.objectsById.values()) {
      if (!object.position) {
        issues.push(`Object ${object.display_name} (${object.name}) has no position data`);
      } else if (isNaN(object.position.x) || isNaN(object.position.y) || isNaN(object.position.z)) {
        issues.push(`Object ${object.display_name} (${object.name}) has invalid position data`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Generate statistics about the data
   */
  public generateStatistics(): Record<string, any> {
    const stats = starSystemService.getStatistics();
    
    // Add more detailed stats
    if (this.starSystem) {
      // Count objects by depth level
      const depthStats: Record<number, number> = {};
      
      const calculateDepth = (objectId: string, currentDepth = 0): void => {
        depthStats[currentDepth] = (depthStats[currentDepth] || 0) + 1;
        
        const children = starSystemService.getChildrenOfObject(objectId);
        for (const child of children) {
          calculateDepth(child.name, currentDepth + 1);
        }
      };
      
      // Start from the star
      calculateDepth(this.starSystem.star.name);
      
      // Add depth stats to the result
      stats.depthStats = depthStats;
      stats.maxDepth = Math.max(...Object.keys(depthStats).map(Number));
      
      // Count objects by parent
      const parentStats: Record<string, number> = {};
      for (const [parentId, children] of this.starSystem.objectsByType.entries()) {
        parentStats[parentId] = children.length;
      }
      stats.parentStats = parentStats;
    }
    
    return stats;
  }
  
  /**
   * Find all disconnected objects (no valid parent chain to star)
   */
  public findDisconnectedObjects(): CelestialObject[] {
    if (!this.starSystem) {
      return [];
    }
    
    const disconnected: CelestialObject[] = [];
    
    // Check each object for a valid path to the star
    for (const object of this.starSystem.objectsById.values()) {
      if (object.type === ObjectType.Star) continue; // Skip the star itself
      
      let current = object;
      let pathToStar = false;
      
      // Traverse up the parent chain to see if we reach the star
      while (current.parent && current.parent !== "") {
        const parent = this.starSystem.objectsById.get(current.parent);
        if (!parent) {
          break; // No valid parent found
        }
        
        if (parent.type === ObjectType.Star) {
          pathToStar = true;
          break;
        }
        
        current = parent;
      }
      
      if (!pathToStar) {
        disconnected.push(object);
      }
    }
    
    return disconnected;
  }
}

// Create a singleton instance for easy import
export const systemDebugger = new SystemDebugger(); 