import { useState, useEffect, useRef } from 'react';
import { PIDController } from './PIDController';
import type { PhysicsState, PhysicsParams, PIDConfig } from './types';
import type { DisturbanceConfig } from './DisturbanceConfig';

const DEFAULT_PHYSICS_PARAMS: PhysicsParams = {
  GRAVITY: 9.8,
  MASS: 1.0,
  MOMENT_OF_INERTIA: 0.1,
  DRAG_COEFFICIENT: 0.1,
  ANGULAR_DRAG_COEFFICIENT: 0.5,
  THRUST_DISTANCE: 0.4,
  CENTER_OF_MASS_OFFSET: 0.0,
  LEFT_THRUST_EFFICIENCY: 1.0,
  RIGHT_THRUST_EFFICIENCY: 1.0
};

const DEFAULT_DISTURBANCE_CONFIG: DisturbanceConfig = {
  wind: {
    enabled: true,
    baseSpeed: 0.0, //0.5,
    gustFrequency: 0.0, //0.2,
    gustMagnitude: 0.0, //1.0,
    turbulenceIntensity: 0.0//0.1
  },
  thrust: {
    enabled: true,
    magnitude: 0.00,
    frequency: 10
  }
};

const DEFAULT_PID_CONFIG: PIDConfig = {
  enabled: true,
  attitude: {
    kp: 8.0,  // 姿勢制御はより高いゲインと速い応答
    ki: 0.5,
    kd: 0.0
  },
  position: {
    horizontal: {
      kp: 1.0,
      ki: 0.05,
      kd: 0.0
    },
    vertical: {
      kp: 1.5,
      ki: 0.05,
      kd: 0.0
    }
  }
};


const DroneSimulator: React.FC = () => {
  const [physicsState, setPhysicsState] = useState<PhysicsState>({
    position: { x: 100, y: 150 },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    angularVelocity: 0,
  });
  
  const [leftThrust, setLeftThrust] = useState<number>(4.9);
  const [rightThrust, setRightThrust] = useState<number>(4.9);
  const [disturbanceConfig, setDisturbanceConfig] = 
    useState<DisturbanceConfig>(DEFAULT_DISTURBANCE_CONFIG);
  const [pidConfig, setPidConfig] = useState<PIDConfig>(DEFAULT_PID_CONFIG);
  
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const windStateRef = useRef({ time: 0, currentGust: 0 });
  
  const calculateDisturbances = (deltaTime: number) => {
    const { wind, thrust } = disturbanceConfig;
    let windForce = 0;
    let thrustNoise = { left: 1, right: 1 };
    
    if (wind.enabled) {
      windStateRef.current.time += deltaTime;
      windForce = wind.baseSpeed;
      
      const gustPhase = 2 * Math.PI * wind.gustFrequency * windStateRef.current.time;
      const gustEffect = Math.sin(gustPhase) * wind.gustMagnitude;
      const turbulence = (Math.random() - 0.5) * 2 * wind.turbulenceIntensity;
      
      windForce += gustEffect + turbulence;
    }
    
    if (thrust.enabled) {
      const noiseLeft = 1 + (Math.random() - 0.5) * 2 * thrust.magnitude;
      const noiseRight = 1 + (Math.random() - 0.5) * 2 * thrust.magnitude;
      thrustNoise = { left: noiseLeft, right: noiseRight };
    }
    
    return { windForce, thrustNoise };
  };

  // PIDコントローラーのインスタンス化
  const attitudePIDRef = useRef(new PIDController(
    DEFAULT_PID_CONFIG.attitude.kp,
    DEFAULT_PID_CONFIG.attitude.ki,
    DEFAULT_PID_CONFIG.attitude.kd,
    -1,  // 最小出力
    1    // 最大出力
  ));

  const horizontalPositionPIDRef = useRef(new PIDController(
    DEFAULT_PID_CONFIG.position.horizontal.kp,
    DEFAULT_PID_CONFIG.position.horizontal.ki,
    DEFAULT_PID_CONFIG.position.horizontal.kd,
    -Math.PI/6, // 最小目標角度
    Math.PI/6   // 最大目標角度
  ));

  const verticalPositionPIDRef = useRef(new PIDController(
    DEFAULT_PID_CONFIG.position.vertical.kp,
    DEFAULT_PID_CONFIG.position.vertical.ki,
    DEFAULT_PID_CONFIG.position.vertical.kd,
    -2,  // 最小推力調整
    2    // 最大推力調整
  ));

  // PIDゲインの更新
  useEffect(() => {
    attitudePIDRef.current.setGains(
      pidConfig.attitude.kp,
      pidConfig.attitude.ki,
      pidConfig.attitude.kd
    );

    horizontalPositionPIDRef.current.setGains(
      pidConfig.position.horizontal.kp,
      pidConfig.position.horizontal.ki,
      pidConfig.position.horizontal.kd
    );

    verticalPositionPIDRef.current.setGains(
      pidConfig.position.vertical.kp,
      pidConfig.position.vertical.ki,
      pidConfig.position.vertical.kd
    );
  }, [pidConfig]);

  // PIDコントローラーのリセット
  useEffect(() => {
    if (!pidConfig.enabled) {
      attitudePIDRef.current.reset();
      horizontalPositionPIDRef.current.reset();
      verticalPositionPIDRef.current.reset();
    }
  }, [pidConfig.enabled]);
  
  const updatePhysics = (deltaTime: number): void => {
    const dt = deltaTime / 100;
    const params = DEFAULT_PHYSICS_PARAMS;
    
    let currentLeftThrust = leftThrust;
    let currentRightThrust = rightThrust;
  
    // PID制御が有効な場合
    if (pidConfig.enabled) {
      // 1. 位置制御（外側ループ）
      const targetX = 300;
      const targetY = 150;
      
      // 垂直位置の制御
      const verticalControl = verticalPositionPIDRef.current.update(
        targetY,
        physicsState.position.y,
        dt
      );
      
      // 水平位置からの目標姿勢角の計算
      const horizontalControl = horizontalPositionPIDRef.current.update(
        targetX,
        physicsState.position.x,
        dt
      );
      const targetRotation = -horizontalControl; // 位置制御出力を目標姿勢角に変換
      
      // 2. 姿勢制御（内側ループ）
      const attitudeControl = attitudePIDRef.current.update(
        targetRotation,
        physicsState.rotation,
        dt
      );
      
      // 3. 制御出力を推力に変換
      const baseThrust = 4.9; // 重力補償
      const thrustDelta = attitudeControl; // 姿勢制御による推力差
      
      // 垂直推力の調整と姿勢制御の組み合わせ
      currentLeftThrust = baseThrust + verticalControl + attitudeControl;  // 修正: - → +
    currentRightThrust = baseThrust + verticalControl - attitudeControl; // 修正: + → -
      
      // 推力の制限
      currentLeftThrust = Math.min(Math.max(currentLeftThrust, 0), 100);
      currentRightThrust = Math.min(Math.max(currentRightThrust, 0), 100);
    }
  
    // 以下、物理シミュレーション部分は変更なし
    const { windForce, thrustNoise } = calculateDisturbances(deltaTime);
    
    const effectiveLeftThrust = currentLeftThrust * params.LEFT_THRUST_EFFICIENCY * thrustNoise.left;
    const effectiveRightThrust = currentRightThrust * params.RIGHT_THRUST_EFFICIENCY * thrustNoise.right;
    
    
    const totalThrust = effectiveLeftThrust + effectiveRightThrust;
    
    // トルクの計算（重心オフセットを考慮）
    const torque = (effectiveRightThrust * (params.THRUST_DISTANCE + params.CENTER_OF_MASS_OFFSET) -
                   effectiveLeftThrust * (params.THRUST_DISTANCE - params.CENTER_OF_MASS_OFFSET));
    
    // 角速度と回転の計算
    const angularAcceleration = 
      (torque - params.ANGULAR_DRAG_COEFFICIENT * physicsState.angularVelocity) / 
      params.MOMENT_OF_INERTIA;
    const newAngularVelocity = physicsState.angularVelocity + angularAcceleration * dt;
    const newRotation = physicsState.rotation + newAngularVelocity * dt;
    
    // 推力と風力の合成
    const thrustForceY = totalThrust * Math.cos(physicsState.rotation);
    const thrustForceX = totalThrust * Math.sin(physicsState.rotation) + windForce;
    
    // 重力と抗力の計算
    const gravityForce = params.MASS * params.GRAVITY;
    const dragForceY = params.DRAG_COEFFICIENT * physicsState.velocity.y * 
      Math.abs(physicsState.velocity.y);
    const dragForceX = params.DRAG_COEFFICIENT * physicsState.velocity.x * 
      Math.abs(physicsState.velocity.x);
    
    // 加速度の計算
    const verticalAcceleration = (thrustForceY - gravityForce - dragForceY) / params.MASS;
    const horizontalAcceleration = (thrustForceX - dragForceX) / params.MASS;
    
    // 速度の更新
    const newVelocityY = physicsState.velocity.y + verticalAcceleration * dt;
    const newVelocityX = physicsState.velocity.x + horizontalAcceleration * dt;
    
    // 位置の更新
    const newPositionY = physicsState.position.y - newVelocityY * dt;
    const newPositionX = physicsState.position.x + newVelocityX * dt;
    
    // 境界条件の処理（壁での反射）
    const finalPositionY = Math.min(Math.max(newPositionY, 10), 290);
    const finalPositionX = Math.min(Math.max(newPositionX, 10), 590);
    const finalVelocityY = finalPositionY === 10 || finalPositionY === 290 ? 0 : newVelocityY;
    const finalVelocityX = finalPositionX === 10 || finalPositionX === 590 ? 0 : newVelocityX;
    
    // 物理状態の更新
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
  }, [physicsState, leftThrust, rightThrust, disturbanceConfig]);

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
      
      {/* 外乱設定UI */}
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">外乱設定</h3>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={disturbanceConfig.wind.enabled}
              onChange={(e) => setDisturbanceConfig(prev => ({
                ...prev,
                wind: { ...prev.wind, enabled: e.target.checked }
              }))}
              className="rounded text-blue-600"
            />
            <span>風の外乱</span>
          </label>
          
          {disturbanceConfig.wind.enabled && (
            <div className="ml-6 space-y-2 mt-2">
              <div>
                <label className="block text-sm text-gray-600">基本風速</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={disturbanceConfig.wind.baseSpeed}
                  onChange={(e) => setDisturbanceConfig(prev => ({
                    ...prev,
                    wind: { ...prev.wind, baseSpeed: Number(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600">突風強度</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={disturbanceConfig.wind.gustMagnitude}
                  onChange={(e) => setDisturbanceConfig(prev => ({
                    ...prev,
                    wind: { ...prev.wind, gustMagnitude: Number(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={disturbanceConfig.thrust.enabled}
              onChange={(e) => setDisturbanceConfig(prev => ({
                ...prev,
                thrust: { ...prev.thrust, enabled: e.target.checked }
              }))}
              className="rounded text-blue-600"
            />
            <span>推力ノイズ</span>
          </label>
          
          {disturbanceConfig.thrust.enabled && (
            <div className="ml-6 mt-2">
              <label className="block text-sm text-gray-600">ノイズ強度</label>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={disturbanceConfig.thrust.magnitude}
                onChange={(e) => setDisturbanceConfig(prev => ({
                  ...prev,
                  thrust: { ...prev.thrust, magnitude: Number(e.target.value) }
                }))}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
      {/* PID制御設定UI部分を修正 */}
<div className="mt-6 space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="text-lg font-medium text-gray-900">PID制御</h3>
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={pidConfig.enabled}
        onChange={(e) => setPidConfig(prev => ({
          ...prev,
          enabled: e.target.checked
        }))}
        className="rounded text-blue-600"
      />
      <span>有効</span>
    </label>
  </div>
  
  {pidConfig.enabled && (
    <div className="space-y-4">
      {/* 姿勢制御ゲイン */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-700">姿勢制御ゲイン</h4>
        <div className="grid grid-cols-3 gap-4">
          {/* Kp */}
          <div>
            <label className="block text-sm text-gray-600">Kp</label>
            <input
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={pidConfig.attitude.kp}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                attitude: {
                  ...prev.attitude,
                  kp: Number(e.target.value)
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.attitude.kp.toFixed(1)}
            </div>
          </div>
          {/* Ki */}
          <div>
            <label className="block text-sm text-gray-600">Ki</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pidConfig.attitude.ki}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                attitude: {
                  ...prev.attitude,
                  ki: Number(e.target.value)
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.attitude.ki.toFixed(2)}
            </div>
          </div>
          {/* Kd */}
          <div>
            <label className="block text-sm text-gray-600">Kd</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pidConfig.attitude.kd}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                attitude: {
                  ...prev.attitude,
                  kd: Number(e.target.value)
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.attitude.kd.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* 水平位置制御ゲイン */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-700">水平位置制御ゲイン</h4>
        <div className="grid grid-cols-3 gap-4">
          {/* Kp */}
          <div>
            <label className="block text-sm text-gray-600">Kp</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pidConfig.position.horizontal.kp}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  horizontal: {
                    ...prev.position.horizontal,
                    kp: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.horizontal.kp.toFixed(2)}
            </div>
          </div>
          {/* Ki */}
          <div>
            <label className="block text-sm text-gray-600">Ki</label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={pidConfig.position.horizontal.ki}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  horizontal: {
                    ...prev.position.horizontal,
                    ki: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.horizontal.ki.toFixed(2)}
            </div>
          </div>
          {/* Kd */}
          <div>
            <label className="block text-sm text-gray-600">Kd</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pidConfig.position.horizontal.kd}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  horizontal: {
                    ...prev.position.horizontal,
                    kd: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.horizontal.kd.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 垂直位置制御ゲイン */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-700">垂直位置制御ゲイン</h4>
        <div className="grid grid-cols-3 gap-4">
          {/* Kp */}
          <div>
            <label className="block text-sm text-gray-600">Kp</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pidConfig.position.vertical.kp}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  vertical: {
                    ...prev.position.vertical,
                    kp: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.vertical.kp.toFixed(2)}
            </div>
          </div>
          {/* Ki */}
          <div>
            <label className="block text-sm text-gray-600">Ki</label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={pidConfig.position.vertical.ki}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  vertical: {
                    ...prev.position.vertical,
                    ki: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.vertical.ki.toFixed(2)}
            </div>
          </div>
          {/* Kd */}
          <div>
            <label className="block text-sm text-gray-600">Kd</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pidConfig.position.vertical.kd}
              onChange={(e) => setPidConfig(prev => ({
                ...prev,
                position: {
                  ...prev.position,
                  vertical: {
                    ...prev.position.vertical,
                    kd: Number(e.target.value)
                  }
                }
              }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {pidConfig.position.vertical.kd.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
    </div>
  );
};

export default DroneSimulator;