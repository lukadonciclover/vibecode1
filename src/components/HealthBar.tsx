export function HealthBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="status-meter health-meter">
      <span>Health</span>
      <div><i style={{ width: `${(value / max) * 100}%` }} /></div>
      <b>{Math.ceil(value)}</b>
    </div>
  )
}
