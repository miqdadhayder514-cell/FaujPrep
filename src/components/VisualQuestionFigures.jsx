const shapeElement = (shape, index) => {
  const common = {
    key: `${shape.type}-${index}`,
    fill: shape.fill || 'none',
    stroke: shape.stroke || '#cbd5e1',
    strokeWidth: Number.isFinite(shape.strokeWidth) ? shape.strokeWidth : 3,
    strokeLinejoin: 'round',
  };
  if (shape.type === 'circle') return <circle {...common} cx={shape.cx ?? 50} cy={shape.cy ?? 50} r={shape.r ?? 20} />;
  if (shape.type === 'rect') return <rect {...common} x={shape.x ?? 20} y={shape.y ?? 20} width={shape.width ?? 60} height={shape.height ?? 60} rx={shape.rx ?? 0} />;
  if (shape.type === 'line') return <line {...common} x1={shape.x1 ?? 20} y1={shape.y1 ?? 20} x2={shape.x2 ?? 80} y2={shape.y2 ?? 80} />;
  if (shape.type === 'polygon' && Array.isArray(shape.points)) return <polygon {...common} points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')} />;
  return null;
};

export function FigureSvg({ data, label, size = 'h-20 w-20' }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} className={`${size} shrink-0 rounded border border-slate-700 bg-slate-950 p-1`}>
      {(data?.shapes || []).map(shapeElement)}
    </svg>
  );
}

export default function VisualQuestionFigures({ question }) {
  const visual = question?.visual_data;
  if (!visual || !Array.isArray(visual.prompt) || !Array.isArray(visual.options) || visual.options.length !== 4) return null;

  return (
    <div className="space-y-4" aria-label="Visual reasoning figures">
      <div className="flex flex-wrap items-center gap-2">
        {visual.prompt.map((item, index) => (
          <div key={`prompt-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="text-slate-500">→</span>}
            {item ? <FigureSvg data={item} label={`Pattern figure ${index + 1}`} /> : <div className="h-20 w-20 rounded border border-dashed border-amber-500 text-center text-2xl leading-[4.5rem] text-amber-300" aria-label="Missing figure">?</div>}
          </div>
        ))}
      </div>
    </div>
  );
}