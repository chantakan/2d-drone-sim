// types.ts
interface Position {
    x: number;
    y: number;
  }
  
  interface Velocity {
    x: number;
    y: number;
  }
  
  interface PhysicsState {
    position: Position;
    velocity: Velocity;
    rotation: number;
    angularVelocity: number;
  }
  
  interface PhysicsParams {
    GRAVITY: number;
    MASS: number;
    MOMENT_OF_INERTIA: number;
    DRAG_COEFFICIENT: number;
    ANGULAR_DRAG_COEFFICIENT: number;
    THRUST_DISTANCE: number;
  }