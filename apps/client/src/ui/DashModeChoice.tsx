export function DashModeChoice({ value, onChange }: { value: "auto" | "manual"; onChange: (value: "auto" | "manual") => void }) {
  return <div className="art-choice dash-mode-choice" role="radiogroup" aria-label="Dash mode">
    {(["auto", "manual"] as const).map((mode) => <button key={mode} type="button" className="art art--choice" role="radio" aria-checked={value === mode} aria-label={mode === "auto" ? "Automatic dash" : "Manual dash"} onClick={() => onChange(mode)}>
      <img src={`${import.meta.env.BASE_URL}ui/dash-${mode}-${value === mode ? "on" : "off"}.webp`} alt="" draggable={false} />
    </button>)}
  </div>;
}
