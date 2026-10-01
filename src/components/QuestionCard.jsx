import VisualQuestionFigures, { FigureSvg } from './VisualQuestionFigures';

export default function QuestionCard({ question, selectedOption, submitted, onSelect }) {
  const options = question.visual_data?.options?.length === 4
    ? question.visual_data.options.map((figure, index) => [String.fromCharCode(65 + index), figure])
    : [
        ['A', question.option_a],
        ['B', question.option_b],
        ['C', question.option_c],
        ['D', question.option_d],
      ].filter(([, value]) => value);

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-relaxed">{question.question_text}</h1>
      {question.visual_data && <VisualQuestionFigures question={question} />}
      {question.image_url && <img src={question.image_url} alt={`Illustration for ${question.question_text?.slice(0, 80) || 'practice question'}`} className="max-h-64 w-full object-contain rounded-xl border border-slate-800" />}
      <div className="grid gap-3">
        {options.map(([option, value]) => (
          <button
            key={option}
            type="button"
            disabled={submitted}
            aria-pressed={selectedOption === option}
            onClick={() => onSelect(option)}
            className={`w-full text-left p-4 rounded-xl border text-sm transition ${selectedOption === option ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200' : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'} disabled:cursor-not-allowed`}
          >
            {question.visual_data?.options?.length === 4
              ? <><span className="font-bold">{option}.</span><FigureSvg data={value} label={`Answer option ${option}`} size="h-16 w-16" /></>
              : <><span className="font-bold mr-3">{option}.</span>{value}</>}
          </button>
        ))}
      </div>
    </div>
  );
}
