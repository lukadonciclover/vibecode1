import type { UserSettings } from '../game/types'

export interface SettingsMenuProps {
  settings: UserSettings
  onChange: (settings: UserSettings) => void
  onReset?: () => void
  onClose?: () => void
  title?: string
}

interface RangeSettingProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}

function RangeSetting({ label, value, min, max, step, display, onChange }: RangeSettingProps) {
  return (
    <label className="settings-menu__field settings-menu__field--range">
      <span>{label}</span>
      <output>{display}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.valueAsNumber)} />
    </label>
  )
}

export function SettingsMenu({ settings, onChange, onReset, onClose, title = 'Settings' }: SettingsMenuProps) {
  const update = <Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]) => {
    onChange({ ...settings, [key]: value })
  }

  return (
    <section className="settings-menu" aria-labelledby="settings-menu-title">
      <header className="settings-menu__header">
        <div>
          <span className="eyebrow">Preferences</span>
          <h2 id="settings-menu-title">{title}</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Close settings">Close</button>}
      </header>

      <div className="settings-menu__group">
        <h3>Video</h3>
        <RangeSetting label="Render distance" value={settings.renderDistance} min={2} max={8} step={1} display={`${settings.renderDistance} chunks`} onChange={(value) => update('renderDistance', value)} />
        <RangeSetting label="Field of view" value={settings.fov} min={55} max={100} step={1} display={`${settings.fov} deg`} onChange={(value) => update('fov', value)} />
        <label className="settings-menu__field settings-menu__field--toggle">
          <span>Fullscreen</span>
          <input type="checkbox" checked={settings.fullscreen} onChange={(event) => update('fullscreen', event.target.checked)} />
        </label>
        <label className="settings-menu__field settings-menu__field--toggle">
          <span>Show FPS</span>
          <input type="checkbox" checked={settings.showFps} onChange={(event) => update('showFps', event.target.checked)} />
        </label>
      </div>

      <div className="settings-menu__group">
        <h3>Controls</h3>
        <RangeSetting label="Mouse sensitivity" value={settings.mouseSensitivity} min={0.2} max={3} step={0.1} display={`${settings.mouseSensitivity.toFixed(1)}x`} onChange={(value) => update('mouseSensitivity', value)} />
      </div>

      <div className="settings-menu__group">
        <h3>Audio</h3>
        <RangeSetting label="Master volume" value={settings.masterVolume} min={0} max={1} step={0.01} display={`${Math.round(settings.masterVolume * 100)}%`} onChange={(value) => update('masterVolume', value)} />
        <RangeSetting label="Music volume" value={settings.musicVolume} min={0} max={1} step={0.01} display={`${Math.round(settings.musicVolume * 100)}%`} onChange={(value) => update('musicVolume', value)} />
        <RangeSetting label="Sound volume" value={settings.soundVolume} min={0} max={1} step={0.01} display={`${Math.round(settings.soundVolume * 100)}%`} onChange={(value) => update('soundVolume', value)} />
      </div>

      {onReset && <button className="settings-menu__reset" type="button" onClick={onReset}>Restore defaults</button>}
    </section>
  )
}
