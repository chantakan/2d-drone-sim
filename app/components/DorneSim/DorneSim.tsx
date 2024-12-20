// DroneSimu.tsx
import { useState, useEffect, useRef } from 'react';

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

const PHYSICS_PARAMS: PhysicsParams = {
  GRAVITY: 9.8,
  MASS: 1.0,
  MOMENT_OF_INERTIA: 0.1,
  DRAG_COEFFICIENT: 0.1,
  ANGULAR_DRAG_COEFFICIENT: 0.5,
  THRUST_DISTANCE: 0.4,
};

const DroneSimulator: React.FC = () => {
  const [physicsState, setPhysicsState] = useState<PhysicsState>({
    position: { x: 150, y: 150 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0,
  });
  
  const [leftThrust, setLeftThrust] = useState<number>(4.9);
  const [rightThrust, setRightThrust] = useState<number>(4.9);
  
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  
  const updatePhysics = (deltaTime: number): void => {
    const dt = deltaTime / 100;
    const {
      GRAVITY, MASS, MOMENT_OF_INERTIA, DRAG_COEFFICIENT,
      ANGULAR_DRAG_COEFFICIENT, THRUST_DISTANCE
    } = PHYSICS_PARAMS;
    
    const totalThrust = leftThrust + rightThrust;
    const torque = (rightThrust - leftThrust) * THRUST_DISTANCE;
    
    const angularAcceleration = 
      (torque - ANGULAR_DRAG_COEFFICIENT * physicsState.angularVelocity) / MOMENT_OF_INERTIA;
    const newAngularVelocity = physicsState.angularVelocity + angularAcceleration * dt;
    const newRotation = physicsState.rotation + newAngularVelocity * dt;
    
    const thrustForceY = totalThrust * Math.cos(physicsState.rotation);
    const thrustForceX = totalThrust * Math.sin(physicsState.rotation);
    
    const gravityForce = MASS * GRAVITY;
    const verticalDragForce = DRAG_COEFFICIENT * physicsState.velocity.y * 
      Math.abs(physicsState.velocity.y);
    const verticalAcceleration = (thrustForceY - gravityForce - verticalDragForce) / MASS;
    
    const horizontalDragForce = DRAG_COEFFICIENT * physicsState.velocity.x * 
      Math.abs(physicsState.velocity.x);
    const horizontalAcceleration = (thrustForceX - horizontalDragForce) / MASS;
    
    const newVelocityY = physicsState.velocity.y + verticalAcceleration * dt;
    const newVelocityX = physicsState.velocity.x + horizontalAcceleration * dt;
    
    const newPositionY = physicsState.position.y - newVelocityY * dt;
    const newPositionX = physicsState.position.x + newVelocityX * dt;
    
    const finalPositionY = Math.min(Math.max(newPositionY, 10), 290);
    const finalPositionX = Math.min(Math.max(newPositionX, 10), 590);
    const finalVelocityY = finalPositionY === 10 || finalPositionY === 290 ? 0 : newVelocityY;
    const finalVelocityX = finalPositionX === 10 || finalPositionX === 590 ? 0 : newVelocityX;
    
    setPhysicsState({
      position: { x: finalPositionX, y: finalPositionY },
      velocity: { x: finalVelocityX, y: finalVelocityY },
      angularVelocity: newAngularVelocity,
      rotation: newRotation,
    });
  };
  
  useEffect(() => {
    const animate = (): void => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      updatePhysics(deltaTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [physicsState, leftThrust, rightThrust]);

  return (
    <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">2Dドローンシミュレーター</h2>
      </div>

      <div className="space-y-6">
        <div className="h-80 bg-slate-100 relative rounded-lg">
          {/* ドローン */}
          <div 
            className="absolute w-16 h-4"
            style={{ 
              top: `${physicsState.position.y}px`,
              left: `${physicsState.position.x}px`,
              transform: `translate(-50%, -50%) rotate(${physicsState.rotation * 180 / Math.PI}deg)`
            }}
          >
            <div className="w-full h-full bg-slate-800 rounded-md relative">
              {/* 左プロペラ */}
              <div 
                className="absolute -left-4 -top-1 w-4 h-1 transition-colors duration-200"
                style={{
                  backgroundColor: `rgb(${Math.min(255, leftThrust * 25)}, 0, 0)`
                }}
              />
              {/* 右プロペラ */}
              <div 
                className="absolute -right-4 -top-1 w-4 h-1 transition-colors duration-200"
                style={{
                  backgroundColor: `rgb(${Math.min(255, rightThrust * 25)}, 0, 0)`
                }}
              />
            </div>
          </div>
          
          {/* 地面 */}
          <div className="absolute bottom-0 w-full h-2 bg-slate-300" />
        </div>
        
        <div className="space-y-4">
          {/* 推力スライダー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              左推力調整
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={leftThrust}
              onChange={(e) => setLeftThrust(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              右推力調整
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={rightThrust}
              onChange={(e) => setRightThrust(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* 情報表示 */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>高度: {(300 - physicsState.position.y).toFixed(1)}px</div>
            <div>水平位置: {physicsState.position.x.toFixed(1)}px</div>
            <div>垂直速度: {(-physicsState.velocity.y).toFixed(1)}px/s</div>
            <div>水平速度: {physicsState.velocity.x.toFixed(1)}px/s</div>
            <div>回転角: {(physicsState.rotation * 180 / Math.PI).toFixed(1)}°</div>
            <div>角速度: {(physicsState.angularVelocity * 180 / Math.PI).toFixed(1)}°/s</div>
            <div>左推力: {leftThrust.toFixed(1)}N</div>
            <div>右推力: {rightThrust.toFixed(1)}N</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DroneSimulator;