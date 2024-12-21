import React, { useState, useEffect, useCallback } from 'react';

interface CartPoleState {
  x: number;
  theta: number;
  dx: number;
  dtheta: number;
  score: number;
}

interface PIDController {
  target: number;
  kp: number;
  ki: number;
  kd: number;
  integral: number;
  lastError: number;
}

const CartPoleSimulator = () => {
  const [state, setState] = useState<CartPoleState>({
    x: 0,
    theta: 0.1,
    dx: 0,
    dtheta: 0,
    score: 0
  });
  
  // PID制御のパラメータ
  const [pidController, setPidController] = useState<PIDController>({
    target: 0,  // 目標角度（垂直）
    kp: 30,     // 比例ゲイン
    ki: 0.1,    // 積分ゲイン
    kd: 10,     // 微分ゲイン
    integral: 0,
    lastError: 0
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [force, setForce] = useState(0);
  const [isAutoPilot, setIsAutoPilot] = useState(false);

  // 物理パラメータ
  const gravity = 9.81;
  const cartMass = 1.0;
  const poleMass = 0.1;
  const totalMass = cartMass + poleMass;
  const poleLength = 0.5;
  const dt = 0.02;
  const maxForce = 15.0;

  // PID制御
  const calculatePIDControl = useCallback((state: CartPoleState, controller: PIDController) => {
    const error = state.theta - controller.target;
    controller.integral = controller.integral + error * dt;
    const derivative = (error - controller.lastError) / dt;
    
    const output = 
      controller.kp * error + 
      controller.ki * controller.integral + 
      controller.kd * derivative;
    
    controller.lastError = error;
    
    // 出力を制限
    return Math.max(-maxForce, Math.min(maxForce, output));
  }, []);

  // 物理シミュレーション
  const updatePhysics = useCallback((currentState: CartPoleState, appliedForce: number) => {
    const { x, theta, dx, dtheta } = currentState;
    
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const poleForce = poleMass * poleLength * dtheta * dtheta * sinTheta;
    
    const temp = totalMass - poleMass * cosTheta * cosTheta;
    
    // ポールの角加速度
    const ddtheta = (
      gravity * sinTheta * totalMass - 
      (appliedForce + poleForce) * cosTheta
    ) / (poleLength * temp);

    // カートの加速度
    const ddx = (
      appliedForce + 
      poleForce + 
      poleMass * poleLength * ddtheta * cosTheta -
      poleMass * poleLength * dtheta * dtheta * sinTheta
    ) / totalMass;

    // オイラー法による状態更新
    const newX = x + dx * dt;
    const newTheta = theta + dtheta * dt;
    const newDx = dx + ddx * dt;
    const newDtheta = dtheta + ddtheta * dt;

    // 角度を-πからπの範囲に正規化
    const normalizedTheta = ((newTheta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const finalTheta = normalizedTheta > Math.PI ? normalizedTheta - 2 * Math.PI : normalizedTheta;

    return {
      x: newX,
      theta: finalTheta,
      dx: newDx,
      dtheta: newDtheta,
      score: currentState.score + 1
    };
  }, []);

  // アニメーションループ
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setState(current => {
        let currentForce = force;
        
        // 自動制御モードの場合、PID制御の出力を使用
        if (isAutoPilot) {
          currentForce = calculatePIDControl(current, pidController);
        }
        
        const newState = updatePhysics(current, currentForce);
        
        // 失敗条件をチェック
        if (
          Math.abs(newState.x) > 2.4 ||
          Math.abs(newState.theta) > Math.PI * 0.5
        ) {
          setIsRunning(false);
          return current;
        }
        
        return newState;
      });
    }, dt * 1000);

    return () => clearInterval(interval);
  }, [isRunning, force, updatePhysics, isAutoPilot, calculatePIDControl, pidController]);

  // キーボード制御
  useEffect(() => {
    if (isAutoPilot) return;  // 自動制御中はキー入力を無効化

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setForce(-maxForce);
      if (e.key === 'ArrowRight') setForce(maxForce);
    };

    const handleKeyUp = () => {
      setForce(0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAutoPilot]);

  // ゲインの更新関数
  const updateGain = (type: 'kp' | 'ki' | 'kd', value: number) => {
    setPidController(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // SVGでの描画
  const scale = 100;
  const cartWidth = 0.5 * scale;
  const cartHeight = 0.3 * scale;
  const poleWidth = 0.1 * scale;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
      <div className="mb-4 space-x-2">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            setState({
              x: 0,
              theta: 0.1,
              dx: 0,
              dtheta: 0,
              score: 0
            });
            setPidController(prev => ({
              ...prev,
              integral: 0,
              lastError: 0
            }));
            setIsRunning(true);
          }}
        >
          リセット
        </button>
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={() => setIsRunning(prev => !prev)}
        >
          {isRunning ? '停止' : '開始'}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            isAutoPilot 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-gray-500 hover:bg-gray-600'
          } text-white`}
          onClick={() => setIsAutoPilot(prev => !prev)}
        >
          {isAutoPilot ? 'PID制御 ON' : 'PID制御 OFF'}
        </button>
      </div>

      {/* PIDゲイン調整 */}
      <div className="mb-4 p-4 border rounded bg-white">
        <h3 className="font-bold mb-2">PIDゲイン調整</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block">Kp (比例)</label>
            <input
              type="number"
              value={pidController.kp}
              onChange={(e) => updateGain('kp', Number(e.target.value))}
              className="w-24 px-2 py-1 border rounded"
            />
          </div>
          <div>
            <label className="block">Ki (積分)</label>
            <input
              type="number"
              value={pidController.ki}
              onChange={(e) => updateGain('ki', Number(e.target.value))}
              className="w-24 px-2 py-1 border rounded"
              step="0.1"
            />
          </div>
          <div>
            <label className="block">Kd (微分)</label>
            <input
              type="number"
              value={pidController.kd}
              onChange={(e) => updateGain('kd', Number(e.target.value))}
              className="w-24 px-2 py-1 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p>スコア: {state.score}</p>
        <p>角度: {(state.theta * 180 / Math.PI).toFixed(1)}°</p>
        <p>位置: {state.x.toFixed(2)}m</p>
        {isAutoPilot && <p>制御力: {force.toFixed(2)}N</p>}
      </div>

      <svg 
        width="600" 
        height="400" 
        className="bg-white border border-gray-300 rounded"
        viewBox="-300 -200 600 400"
      >
        {/* 地面 */}
        <line
          x1="-240"
          y1="0"
          x2="240"
          y2="0"
          stroke="black"
          strokeWidth="2"
        />

        {/* カート */}
        <g transform={`translate(${state.x * scale}, 0)`}>
          <rect
            x={-cartWidth / 2}
            y={-cartHeight}
            width={cartWidth}
            height={cartHeight}
            fill="blue"
          />

          {/* ポール */}
          <line
            x1="0"
            y1={-cartHeight}
            x2={Math.sin(state.theta) * poleLength * 2 * scale}
            y2={-cartHeight - Math.cos(state.theta) * poleLength * 2 * scale}
            stroke="red"
            strokeWidth={poleWidth}
          />

          {/* ポールの重心 */}
          <circle
            cx={Math.sin(state.theta) * poleLength * scale}
            cy={-cartHeight - Math.cos(state.theta) * poleLength * scale}
            r="5"
            fill="black"
          />
        </g>

        {/* 境界線 */}
        <line x1="-240" y1="-150" x2="-240" y2="0" stroke="red" strokeDasharray="5,5" />
        <line x1="240" y1="-150" x2="240" y2="0" stroke="red" strokeDasharray="5,5" />
      </svg>

      <div className="mt-4 text-center">
        {isAutoPilot ? (
          <p>PID制御がポールのバランスを自動的に保ちます</p>
        ) : (
          <p>← → キーで制御</p>
        )}
      </div>
    </div>
  );
};

export default CartPoleSimulator;