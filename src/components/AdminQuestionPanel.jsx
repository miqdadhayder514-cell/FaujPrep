import { useEffect, useState } from 'react';
import {
  createAdminQuestion,
  deleteAdminQuestion,
  getAdminQuestions,
  updateAdminQuestion,
} from '../lib/queries';

const emptyQuestion = {
  question_text: '',
  question_type: 'MCQ',
  difficulty: 'MEDIUM',
  subject_id: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  explanation: '',
  is_active: true,
  is_verified: false,
};

export default function AdminQuestionPanel({ subjects, addToast }) {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      setQuestions(await getAdminQuestions());
    } catch (error) {
      addToast(error.message || 'Unable to load admin questions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.question_text.trim()) return;
    try {
      if (editingId) {
        await updateAdminQuestion(editingId, form);
        addToast('Question updated.', 'success');
      } else {
        await createAdminQuestion(form);
        addToast('Question created.', 'success');
      }
      setForm(emptyQuestion);
      setEditingId(null);
      await loadQuestions();
    } catch (error) {
      addToast(error.message || 'Unable to save question.', 'error');
    }
  };

  const edit = (question) => {
    setEditingId(question.id);
    setForm({ ...emptyQuestion, ...question });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (questionId) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await deleteAdminQuestion(questionId);
      addToast('Question deleted.', 'success');
      await loadQuestions();
    } catch (error) {
      addToast(error.message || 'Unable to delete question.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-100">{editingId ? 'Edit Question' : 'Add Question'}</h2>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyQuestion); }} className="text-xs text-slate-400 hover:text-white">Cancel edit</button>}
        </div>
        <textarea name="question_text" value={form.question_text} onChange={updateField} rows="3" placeholder="Question text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100" required />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select name="subject_id" value={form.subject_id || ''} onChange={updateField} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
            <option value="">Select subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select name="difficulty" value={form.difficulty} onChange={updateField} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
          <select name="correct_option" value={form.correct_option} onChange={updateField} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"><option value="A">Correct: A</option><option value="B">Correct: B</option><option value="C">Correct: C</option><option value="D">Correct: D</option></select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {['a', 'b', 'c', 'd'].map((option) => <input key={option} name={`option_${option}`} value={form[`option_${option}`] || ''} onChange={updateField} placeholder={`Option ${option.toUpperCase()}`} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100" />)}
        </div>
        <textarea name="explanation" value={form.explanation || ''} onChange={updateField} rows="2" placeholder="Explanation shown after submission" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100" />
        <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} /> Active question</label>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">{editingId ? 'Save Question' : 'Create Question'}</button>
      </form>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between"><h2 className="font-bold text-slate-100">Question Bank</h2><span className="text-xs text-slate-500">{questions.length} loaded</span></div>
        {loading ? <p className="p-6 text-sm text-slate-400">Loading questions...</p> : questions.length === 0 ? <p className="p-6 text-sm text-slate-400">No questions available.</p> : <div className="divide-y divide-slate-800">{questions.map((question) => <div key={question.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm text-slate-200">{question.question_text}</p><span className="text-[10px] font-mono text-slate-500">{question.difficulty} / Answer {question.correct_option} / {question.is_active ? 'Active' : 'Inactive'}</span></div><div className="flex gap-2 shrink-0"><button onClick={() => edit(question)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs">Edit</button><button onClick={() => remove(question.id)} className="px-3 py-2 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs">Delete</button></div></div>)}</div>}
      </div>
    </div>
  );
}
