import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { systemInitializer } from './services/SystemInitializer'
import { starSystemService } from './services/StarSystemService'
import { ObjectType, CelestialObject } from './models/StarSystemTypes'
import { systemDebugger } from './utils/SystemDebugger'

function App() {
  const [count, setCount] = useState(0)
  const [systemLoaded, setSystemLoaded] = useState(false)
  const [systemError, setSystemError] = useState<string | null>(null)
  const [systemStats, setSystemStats] = useState<Record<string, any> | null>(null)
  const [planets, setPlanets] = useState<CelestialObject[]>([])
  const [jumpPoints, setJumpPoints] = useState<CelestialObject[]>([])
  const [stations, setStations] = useState<CelestialObject[]>([])

  useEffect(() => {
    const loadStarSystem = async () => {
      try {
        await systemInitializer.initialize()
        setSystemLoaded(true)
        setSystemError(null)
        setSystemStats(starSystemService.getStatistics())
        
        // Get key celestial objects
        setPlanets(starSystemService.getObjectsByType(ObjectType.Planet))
        setJumpPoints(starSystemService.getObjectsByType(ObjectType.JumpPoint))
        
        // Combine different station types
        const allStations = [
          ...starSystemService.getObjectsByType(ObjectType.Station),
          ...starSystemService.getObjectsByType(ObjectType.RestStop),
          ...starSystemService.getObjectsByType(ObjectType.Outpost)
        ]
        setStations(allStations)
        
        // Print hierarchy to console for debugging
        systemInitializer.printHierarchy()
      } catch (error: any) {
        console.error('Failed to load star system:', error)
        setSystemLoaded(false)
        setSystemError(error.message || 'Unknown error loading star system')
      }
    }

    loadStarSystem()
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Star Citizen - Stanton System Map</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          {systemLoaded 
            ? `Star system loaded successfully!` 
            : systemError 
              ? `Error loading star system: ${systemError}` 
              : 'Loading star system data...'}
        </p>
        {systemStats && (
          <div className="system-stats">
            <h3>System Statistics</h3>
            <p>Total objects: {systemStats.objectCount}</p>
            <p>Jump Points: {systemStats.typeStats[ObjectType.JumpPoint] || 0}</p>
            <p>Planets: {systemStats.typeStats[ObjectType.Planet] || 0}</p>
            <p>Moons: {systemStats.typeStats[ObjectType.Moon] || 0}</p>
            <p>Stations: {
              (systemStats.typeStats[ObjectType.Station] || 0) +
              (systemStats.typeStats[ObjectType.RestStop] || 0) +
              (systemStats.typeStats[ObjectType.Outpost] || 0)
            }</p>
          </div>
        )}
        
        {systemLoaded && (
          <div className="system-details">
            <h3>Planets in Stanton System</h3>
            <ul className="object-list">
              {planets.map(planet => (
                <li key={planet.name}>
                  {planet.display_name} - Size: {(planet.size / 1000).toFixed(0)} km
                </li>
              ))}
            </ul>
            
            <h3>Jump Points</h3>
            <ul className="object-list">
              {jumpPoints.map(jp => (
                <li key={jp.name}>
                  {jp.display_name} Jump Point
                </li>
              ))}
            </ul>
            
            <h3>Major Stations ({stations.length})</h3>
            <ul className="object-list station-list">
              {stations.slice(0, 10).map(station => (
                <li key={station.name}>
                  {station.display_name} ({station.type})
                </li>
              ))}
              {stations.length > 10 && <li>...and {stations.length - 10} more</li>}
            </ul>
          </div>
        )}
      </div>
      <p className="read-the-docs">
        Star Citizen system map data parser
      </p>
    </>
  )
}

export default App
