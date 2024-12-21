export interface WindDisturbance {
  enabled: boolean;
  baseSpeed: number;
  gustFrequency: number;
  gustMagnitude: number;
  turbulenceIntensity: number;
}

export interface ThrustNoise {
  enabled: boolean;
  magnitude: number;
  frequency: number;
}

export interface DisturbanceConfig {
  wind: WindDisturbance;
  thrust: ThrustNoise;
}