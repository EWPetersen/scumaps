import { AlertPrediction, AlertType, Position, RouteAlert } from '../models/stanton';
import { FirestoreAlert } from '../models/firestore';
import { calculateDistance } from './stantonParser';

/**
 * Default expiration time for alerts (2 hours)
 */
const DEFAULT_ALERT_EXPIRATION = 2 * 60 * 60 * 1000;

/**
 * Calculate the safety score for an alert based on confirmations and disputes
 * @param alert The alert to calculate the safety score for
 * @param confirmationWeight Weight of confirmations in the calculation (0-1)
 * @param disputeWeight Weight of disputes in the calculation (0-1)
 * @returns A safety score between 0-100
 */
export function calculateSafetyScore(
  alert: { confirmations: number; disputes: number },
  confirmationWeight = 0.7,
  disputeWeight = 0.3
): number {
  const totalVotes = alert.confirmations + alert.disputes;
  
  if (totalVotes === 0) {
    return 50; // Neutral score if no votes
  }
  
  const confirmationRatio = alert.confirmations / totalVotes;
  // Higher confirmations = lower safety (more dangerous)
  const rawScore = 100 - (confirmationRatio * 100 * confirmationWeight) 
                  + ((1 - confirmationRatio) * 100 * disputeWeight);
                  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Create a new route alert
 * @param userId The ID of the user creating the alert
 * @param position The position of the alert
 * @param regionId The ID of the region where the alert is located
 * @param alertType The type of alert
 * @param shardId The ID of the shard where the alert was reported
 * @param description Optional description of the alert
 * @returns A new route alert object
 */
export function createRouteAlert(
  userId: string,
  position: Position,
  regionId: string,
  alertType: AlertType,
  shardId: string,
  description?: string
): FirestoreAlert {
  const now = Date.now();
  
  return {
    id: `alert_${now}_${userId.substring(0, 8)}`,
    location: {
      position,
      regionId
    },
    alertType,
    createdBy: userId,
    createdAt: now,
    expiresAt: now + DEFAULT_ALERT_EXPIRATION,
    confirmations: { [userId]: now }, // Auto-confirm by creator
    disputes: {},
    shardId,
    safetyScore: 20, // Start as fairly dangerous (low score = dangerous)
    isActive: true,
    lastUpdated: now,
    description
  };
}

/**
 * Check if an alert is active (not expired)
 * @param alert The alert to check
 * @returns Whether the alert is active
 */
export function isAlertActive(alert: { expiresAt: number }): boolean {
  return Date.now() < alert.expiresAt;
}

/**
 * Find alerts within a certain radius of a position
 * @param position The position to check
 * @param alerts The list of alerts to search
 * @param radius The radius to search within (in meters)
 * @returns A list of alerts within the radius
 */
export function findAlertsInRadius(
  position: Position,
  alerts: RouteAlert[],
  radius: number
): RouteAlert[] {
  return alerts.filter(alert => {
    const distance = calculateDistance(position, alert.location.position);
    return distance <= radius;
  });
}

/**
 * Calculate the total number of votes (confirmations + disputes) for an alert
 * @param alert The alert to calculate votes for
 * @returns The total number of votes
 */
export function getTotalVotes(alert: FirestoreAlert): number {
  return Object.keys(alert.confirmations).length + Object.keys(alert.disputes).length;
}

/**
 * Calculate the decay of an alert based on its age
 * @param alert The alert to calculate decay for
 * @param decayRate The rate at which alerts decay (0-1)
 * @returns The decay factor (0-1) where 0 means no decay and 1 means full decay
 */
export function calculateAlertDecay(
  alert: { createdAt: number; expiresAt: number },
  decayRate = 0.5
): number {
  const now = Date.now();
  const alertAge = now - alert.createdAt;
  const alertLifetime = alert.expiresAt - alert.createdAt;
  
  // Calculate decay as a percentage of the alert's lifetime
  const decay = Math.min(1, Math.max(0, alertAge / alertLifetime));
  
  // Apply decay rate factor
  return decay * decayRate;
}

/**
 * Get the color for an alert type
 * @param alertType The alert type
 * @returns A hex color code for the alert type
 */
export function getAlertColor(alertType: AlertType): string {
  switch (alertType) {
    case 'pirate':
      return '#FF4136'; // Red
    case 'security':
      return '#0074D9'; // Blue
    case 'debris':
      return '#FF851B'; // Orange
    case 'anomaly':
      return '#B10DC9'; // Purple
    case 'trade':
      return '#2ECC40'; // Green
    default:
      return '#AAAAAA'; // Gray for unknown types
  }
}

/**
 * Check if a user can report an alert in a region based on throttling rules
 * @param userId The ID of the user
 * @param regionId The ID of the region
 * @param userAlerts All alerts reported by the user
 * @param throttleTime The minimum time between alerts in the same region (in ms)
 * @returns Whether the user can report an alert
 */
export function canReportAlert(
  userId: string,
  regionId: string,
  userAlerts: FirestoreAlert[],
  throttleTime = 5 * 60 * 1000 // 5 minutes
): boolean {
  const now = Date.now();
  
  // Find the most recent alert by this user in this region
  const mostRecentAlert = userAlerts
    .filter(alert => alert.location.regionId === regionId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
    
  // If no recent alert or enough time has passed, user can report
  return !mostRecentAlert || (now - mostRecentAlert.createdAt) > throttleTime;
} 