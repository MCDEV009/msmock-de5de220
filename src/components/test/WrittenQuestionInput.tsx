import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WrittenAnswer } from '@/types/test';

interface WrittenQuestionInputProps {
  questionId: string;
  answer: WrittenAnswer | undefined;
  onChange: (questionId: string, answer: WrittenAnswer) => void;
  disabled?: boolean;
}

export function WrittenQuestionInput({ 
  questionId, 
  answer, 
  onChange,
  disabled = false 
}: WrittenQuestionInputProps) {
  const currentAnswer: WrittenAnswer = answer || { answer_a: '', answer_b: '' };

  const handleChange = (field: 'answer_a' | 'answer_b', value: string) => {
    onChange(questionId, {
      ...currentAnswer,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${questionId}-a`} className="text-base font-medium">
            Javob A
          </Label>
          <Badge variant="outline" className="text-xs">Answer A</Badge>
        </div>
        <Textarea
          id={`${questionId}-a`}
          value={currentAnswer.answer_a}
          onChange={(e) => handleChange('answer_a', e.target.value)}
          placeholder="Birinchi javobingizni yozing..."
          rows={4}
          disabled={disabled}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {currentAnswer.answer_a.length} / 2000 belgi
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${questionId}-b`} className="text-base font-medium">
            Javob B
          </Label>
          <Badge variant="outline" className="text-xs">Answer B</Badge>
        </div>
        <Textarea
          id={`${questionId}-b`}
          value={currentAnswer.answer_b}
          onChange={(e) => handleChange('answer_b', e.target.value)}
          placeholder="Ikkinchi javobingizni yozing..."
          rows={4}
          disabled={disabled}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {currentAnswer.answer_b.length} / 2000 belgi
        </p>
      </div>
    </div>
  );
}
