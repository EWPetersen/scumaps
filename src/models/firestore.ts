import { AlertType, Position, SubscriptionStatus } from './stanton';

// Firestore Collections
export enum FirestoreCollection {
  USERS = 'users',
  ALERTS = 'alerts',
  ROUTES = 'routes',
  SHIPS = 'ships',
  PREDICTIONS = 'predictions',
  SYSTEM_CONFIG = 'system_config',
}

// User document in Firestore
export interface FirestoreUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: number;
  lastActive: number;
  reputation: number;
  subscription: SubscriptionStatus;
  subscriptionExpiresAt?: number;
  settings: {
    darkMode: boolean;
    showAllAlerts: boolean;
    alertNotifications: boolean;
    defaultShip?: string;
  };
  reportedAlerts: string[];
  savedRoutes: string[];
  favoriteLocations: string[];
}

// Alert document in Firestore
export interface FirestoreAlert {
  id: string;
  location: {
    position: Position;
    regionId: string;
  };
  alertType: AlertType;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  confirmations: Record<string, number>; // userId: timestamp
  disputes: Record<string, number>; // userId: timestamp
  shardId: string;
  safetyScore: number;
  description?: string;
  isActive: boolean;
  lastUpdated: number;
}

// Route document in Firestore
export interface FirestoreRoute {
  id: string;
  name: string;
  startPoint: string; // ID of the start location
  endPoint: string; // ID of the end location
  waypoints: string[]; // Array of waypoint IDs
  distance: number;
  estimatedTime: number;
  fuelRequired: number;
  createdAt: number;
  lastUpdated: number;
  createdBy: string;
  isPublic: boolean;
  views: number;
  saves: number;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// Ship document in Firestore
export interface FirestoreShip {
  id: string;
  name: string;
  manufacturer: string;
  size: number;
  fuelCapacity: number;
  fuelConsumption: number;
  quantumSpeed: number; 
  scmSpeed: number;
  cargoCapacity: number;
  price: number;
  isTemplate: boolean; // If true, this is a template ship that users can select
  createdBy?: string; // If custom ship, references the user who created it
  lastUpdated: number;
}

// Prediction document in Firestore
export interface FirestorePrediction {
  id: string;
  regionId: string;
  probability: number;
  alertType: AlertType;
  confidence: number;
  predictedAt: number;
  expiresAt: number;
  basedOnHistorical: boolean;
  dataPoints: number; // Number of data points used to make this prediction
}

// System Configuration document in Firestore
export interface FirestoreSystemConfig {
  id: string;
  lastUpdate: number;
  currentVersion: string;
  maintenanceMode: boolean;
  featuredRoutes: string[];
  alertDecayRate: number; // How quickly alerts decay over time
  confirmationWeight: number; // How much confirmations affect safety score
  disputeWeight: number; // How much disputes affect safety score
  maxAlertLifetime: number; // Maximum lifetime of an alert in milliseconds
  shardConfiguration: {
    active: boolean;
    shardCount: number;
    shardNames: string[];
  };
  aiPredictionSettings: {
    enabled: boolean;
    minDataPoints: number;
    predictionInterval: number; // How often AI predictions are updated
    maxPredictionAge: number; // How long predictions are valid for
  };
}

// Subscription tiers and features
export interface SubscriptionTier {
  id: SubscriptionStatus;
  name: string;
  price: number; // Monthly price in USD
  features: {
    maxSavedRoutes: number;
    maxCustomShips: number;
    aiPredictions: boolean;
    adFree: boolean;
    premiumSupport: boolean;
    multiHopPlanning: boolean;
    extendedAlertHistory: boolean;
    customizations: boolean;
  };
}

// Database queries and indexes
export interface FirestoreIndex {
  collection: FirestoreCollection;
  fields: string[];
  queryPattern: string; // Description of the query pattern this index supports
}

// List of indexes needed for efficient queries
export const FIRESTORE_INDEXES: FirestoreIndex[] = [
  {
    collection: FirestoreCollection.ALERTS,
    fields: ['shardId', 'isActive', 'createdAt'],
    queryPattern: 'Get active alerts for a specific shard ordered by creation time'
  },
  {
    collection: FirestoreCollection.ALERTS,
    fields: ['regionId', 'isActive', 'alertType'],
    queryPattern: 'Get active alerts of a specific type in a region'
  },
  {
    collection: FirestoreCollection.ROUTES,
    fields: ['createdBy', 'lastUpdated'],
    queryPattern: 'Get routes created by a user ordered by last update time'
  },
  {
    collection: FirestoreCollection.ROUTES,
    fields: ['isPublic', 'views'],
    queryPattern: 'Get public routes ordered by view count'
  },
  {
    collection: FirestoreCollection.PREDICTIONS,
    fields: ['regionId', 'expiresAt'],
    queryPattern: 'Get active predictions for a region'
  }
]; 