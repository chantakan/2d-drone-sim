// PIDController.ts
export class PIDController {
    private prevError: number = 0;
    private integral: number = 0;
    private lastTime: number | null = null;
  
    constructor(
      private kp: number,
      private ki: number,
      private kd: number,
      private outputMin: number = -Infinity,
      private outputMax: number = Infinity
    ) {}
  
    public update(setpoint: number, measured: number, dt: number): number {
      const error = setpoint - measured;
      this.integral += error * dt;
      
      // Anti-windup: 積分値の制限
      const maxIntegral = (this.outputMax - this.kp * error) / this.ki;
      const minIntegral = (this.outputMin - this.kp * error) / this.ki;
      this.integral = Math.min(Math.max(this.integral, minIntegral), maxIntegral);
      
      const derivative = (error - this.prevError) / dt;
      this.prevError = error;
  
      let output = this.kp * error + this.ki * this.integral + this.kd * derivative;
      output = Math.min(Math.max(output, this.outputMin), this.outputMax);
      
      return output;
    }
  
    public reset(): void {
      this.prevError = 0;
      this.integral = 0;
      this.lastTime = null;
    }
  
    public setGains(kp: number, ki: number, kd: number): void {
      this.kp = kp;
      this.ki = ki;
      this.kd = kd;
    }
  }