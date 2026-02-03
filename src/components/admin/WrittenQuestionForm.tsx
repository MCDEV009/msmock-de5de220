import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface WrittenQuestionFormData {
  question_text_uz: string;
  question_text_ru: string;
  model_answer_uz: string;
  model_answer_ru: string;
  rubric_uz: string;
  rubric_ru: string;
  max_points: number;
  image_url: string;
}

interface WrittenQuestionFormProps {
  form: WrittenQuestionFormData;
  onChange: (updates: Partial<WrittenQuestionFormData>) => void;
}

export function WrittenQuestionForm({ form, onChange }: WrittenQuestionFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Badge className="bg-accent text-accent-foreground">Yozma savol</Badge>
        <span className="text-sm text-muted-foreground">
          Written question with AI evaluation
        </span>
      </div>

      {/* Question Text */}
      <div className="space-y-2">
        <Label>Savol matni (O'zbekcha) *</Label>
        <Textarea
          value={form.question_text_uz}
          onChange={(e) => onChange({ question_text_uz: e.target.value })}
          placeholder="Savol matnini kiriting..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Savol matni (Ruscha)</Label>
        <Textarea
          value={form.question_text_ru}
          onChange={(e) => onChange({ question_text_ru: e.target.value })}
          placeholder="Текст вопроса..."
          rows={2}
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label>Rasm URL (ixtiyoriy)</Label>
        <Input
          value={form.image_url}
          onChange={(e) => onChange({ image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      {/* Model Answer */}
      <div className="space-y-2">
        <Label>Namunaviy javob (O'zbekcha) *</Label>
        <Textarea
          value={form.model_answer_uz}
          onChange={(e) => onChange({ model_answer_uz: e.target.value })}
          placeholder="To'g'ri javobning namunasini yozing..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          AI baholash uchun to'g'ri javob namunasi. O'quvchi javobi bunga qarab baholanadi.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Namunaviy javob (Ruscha)</Label>
        <Textarea
          value={form.model_answer_ru}
          onChange={(e) => onChange({ model_answer_ru: e.target.value })}
          placeholder="Образец правильного ответа..."
          rows={3}
        />
      </div>

      {/* Rubric */}
      <div className="space-y-2">
        <Label>Baholash mezonlari (O'zbekcha)</Label>
        <Textarea
          value={form.rubric_uz}
          onChange={(e) => onChange({ rubric_uz: e.target.value })}
          placeholder="Qanday hollarda to'liq ball beriladi, qanday hollarda qisman..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          AI uchun qo'shimcha ko'rsatmalar: qaysi fikrlar muhim, qaysi xatolar kechirilarli va h.k.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Baholash mezonlari (Ruscha)</Label>
        <Textarea
          value={form.rubric_ru}
          onChange={(e) => onChange({ rubric_ru: e.target.value })}
          placeholder="Критерии оценивания..."
          rows={2}
        />
      </div>

      {/* Max Points */}
      <div className="space-y-2">
        <Label>Maksimal ball</Label>
        <Input
          type="number"
          value={form.max_points}
          onChange={(e) => onChange({ max_points: parseInt(e.target.value) || 2 })}
          min={1}
          max={5}
        />
        <p className="text-xs text-muted-foreground">
          Milliy Sertifikat formati uchun odatda 2 ball
        </p>
      </div>
    </div>
  );
}
