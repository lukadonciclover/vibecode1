export function HungerBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="status-meter hunger-meter">
      <span>Hunger</span>
      <div><i style={{ width: `${(value / max) * 100}%` }} /></div>
      <b>{Math.ceil(value)}</b>
    </div>
  )
}
