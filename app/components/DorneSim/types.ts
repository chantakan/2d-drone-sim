export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface PhysicsState {
  position: Position;
  velocity: Velocity;
  rotation: number;
  angularVelocity: number;
}

export interface PhysicsParams {
  GRAVITY: number;
  MASS: number;
  MOMENT_OF_INERTIA: number;
  DRAG_COEFFICIENT: number;
  ANGULAR_DRAG_COEFFICIENT: number;
  THRUST_DISTANCE: number;
  CENTER_OF_MASS_OFFSET: number;
  LEFT_THRUST_EFFICIENCY: number;
  RIGHT_THRUST_EFFICIENCY: number;
}

// types.ts に追加
export interface PIDConfig {
  enabled: boolean;
  attitude: {
    kp: number;
    ki: number;
    kd: number;
  };
  position: {
    horizontal: {
      kp: number;
      ki: number;
      kd: number;
    };
    vertical: {
      kp: number;
      ki: number;
      kd: number;
    };
  };
}