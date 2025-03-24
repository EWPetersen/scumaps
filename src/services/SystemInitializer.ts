import { starSystemService } from './StarSystemService';
import { systemDebugger } from '../utils/SystemDebugger';
import { loadStantonData } from '../data/jsonLoader';

/**
 * Service responsible for initializing the star system data during app startup
 */
export class SystemInitializer {
  private initialized = false;
  
  /**
   * Initialize the star system data
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Star system already initialized');
      return;
    }
    
    // Define possible paths to try in order
    const possiblePaths = [
      '/data/stanton_extract.json',
      '/stanton_extract.json',
      '/src/stanton_extract.json'
    ];
    
    let lastError: Error | null = null;
    
    // Try each path until one works
    for (const path of possiblePaths) {
      try {
        console.log(`Loading Stanton system data from: ${path}`);
        
        // Load the star system data from file
        const starSystem = await starSystemService.loadFromFile(path);
        
        // Set up the debugger
        systemDebugger.setStarSystem(starSystem);
        
        // Validate the data
        const validation = systemDebugger.validateData();
        if (!validation.valid) {
          console.warn('Star system data has issues:', validation.issues);
        } else {
          console.log('Star system data loaded and validated successfully');
        }
        
        // Log some statistics
        const stats = systemDebugger.generateStatistics();
        console.log('Star system statistics:', stats);
        
        this.initialized = true;
        return; // Successfully loaded, exit the function
      } catch (error: any) {
        console.warn(`Failed to load from ${path}:`, error.message);
        lastError = error;
        // Continue to the next path
      }
    }
    
    // Try loading directly from imported JSON as a final fallback
    try {
      console.log('Attempting to load data directly from imported JSON...');
      const jsonData = await loadStantonData();
      const starSystem = starSystemService.loadFromObject(jsonData);
      
      // Set up the debugger
      systemDebugger.setStarSystem(starSystem);
      
      // Validate the data
      const validation = systemDebugger.validateData();
      if (!validation.valid) {
        console.warn('Star system data has issues:', validation.issues);
      } else {
        console.log('Star system data loaded and validated successfully');
      }
      
      // Log some statistics
      const stats = systemDebugger.generateStatistics();
      console.log('Star system statistics:', stats);
      
      this.initialized = true;
      return; // Successfully loaded, exit the function
    } catch (error: any) {
      console.error('Failed to load from imported JSON:', error.message);
      lastError = error;
    }
    
    // If we get here, all paths failed
    console.error('Failed to initialize star system data from all paths');
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Could not load star system data from any location');
    }
  }
  
  /**
   * Check if the system has been initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Print the hierarchical structure for debugging
   */
  public printHierarchy(): void {
    if (!this.initialized) {
      console.warn('System not initialized, cannot print hierarchy');
      return;
    }
    
    const hierarchy = systemDebugger.generateHierarchyText();
    console.log(hierarchy);
  }
}

// Create a singleton instance for easy import
export const systemInitializer = new SystemInitializer(); 