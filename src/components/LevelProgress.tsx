import { LEVELS } from '../constants';

interface LevelProgressProps {
  level: number;
  onChange?: (level: number) => void;
  compact?: boolean;
}

export default function LevelProgress({ level, onChange, compact = false }: LevelProgressProps) {
  const safeLevel = Math.min(3, Math.max(0, Number(level) || 0));
  const label = LEVELS[safeLevel]?.label ?? 'Não estudado';
  return (
    <div className={`level-widget ${compact ? 'level-widget-compact' : ''}`}>
      <div className="level-widget-head">
        <span className={`level-name level-${safeLevel}`}>{label}</span>
        {onChange && (
          <select
            className="level-select"
            aria-label="Alterar nível de domínio"
            value={safeLevel}
            onChange={(event) => onChange(Number(event.target.value))}
          >
            {LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        )}
      </div>
      <div className="level-track" aria-label={`Nível de domínio: ${label}`} role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={safeLevel}>
        <div className={`level-fill level-${safeLevel}`} />
      </div>
    </div>
  );
}
