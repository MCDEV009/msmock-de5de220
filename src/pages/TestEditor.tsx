import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Test, Question } from '@/types/test';
import { User, Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical,
  Image as ImageIcon,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

function TestEditorContent() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  
  const [questionForm, setQuestionForm] = useState({
    question_text_uz: '',
    question_text_ru: '',
    options: ['', '', '', ''],
    correct_option: 0,
    image_url: '',
    points: 1
  });

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate('/auth');
        }
      }
    );
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate('/auth');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch test and questions
  useEffect(() => {
    if (!testId || !user) return;
    
    async function fetchData() {
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();
      
      if (testData) {
        setTest(testData as Test);
      }
      
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index');
      
      if (questionsData) {
        setQuestions(questionsData as Question[]);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [testId, user]);

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text_uz: '',
      question_text_ru: '',
      options: ['', '', '', ''],
      correct_option: 0,
      image_url: '',
      points: 1
    });
    setEditingQuestion(null);
  };

  const handleOpenQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question_text_uz: question.question_text_uz,
        question_text_ru: question.question_text_ru || '',
        options: question.options as string[],
        correct_option: question.correct_option,
        image_url: question.image_url || '',
        points: question.points
      });
    } else {
      resetQuestionForm();
    }
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text_uz.trim()) {
      toast.error('Savol matnini kiriting');
      return;
    }
    
    const filledOptions = questionForm.options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      toast.error('Kamida 2 ta variant kerak');
      return;
    }
    
    const questionData = {
      test_id: testId,
      question_text_uz: questionForm.question_text_uz.trim(),
      question_text_ru: questionForm.question_text_ru.trim() || null,
      options: filledOptions,
      correct_option: questionForm.correct_option,
      image_url: questionForm.image_url.trim() || null,
      points: questionForm.points,
      order_index: editingQuestion ? editingQuestion.order_index : questions.length
    };
    
    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', editingQuestion.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Savol yangilandi');
        setQuestions(questions.map(q => 
          q.id === editingQuestion.id ? { ...q, ...questionData } as Question : q
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Savol qo\'shildi');
        setQuestions([...questions, data as Question]);
      }
    }
    
    setQuestionDialogOpen(false);
    resetQuestionForm();
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionToDelete.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Savol o\'chirildi');
      setQuestions(questions.filter(q => q.id !== questionToDelete.id));
    }
    
    setDeleteDialogOpen(false);
    setQuestionToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Test topilmadi</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="test-container">
          <div className="flex h-16 items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold truncate">{test.title_uz}</h1>
              <p className="text-sm text-muted-foreground">{questions.length} ta savol</p>
            </div>
            <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenQuestionDialog()} className="gap-2 gradient-primary border-0">
                  <Plus className="h-4 w-4" />
                  {t('addQuestion')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? t('editQuestion') : t('addQuestion')}</DialogTitle>
                  <DialogDescription>Savol ma'lumotlarini kiriting</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('questionText')} (O'zbekcha) *</Label>
                    <Textarea
                      value={questionForm.question_text_uz}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text_uz: e.target.value })}
                      placeholder="Savol matnini kiriting..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('questionText')} (Ruscha)</Label>
                    <Textarea
                      value={questionForm.question_text_ru}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text_ru: e.target.value })}
                      placeholder="Текст вопроса..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Rasm URL (ixtiyoriy)
                    </Label>
                    <Input
                      value={questionForm.image_url}
                      onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Javob variantlari *</Label>
                    {questionForm.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[i] = e.target.value;
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          placeholder={`${i + 1}-variant`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('correctOption')}</Label>
                      <Select
                        value={questionForm.correct_option.toString()}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, correct_option: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {questionForm.options.map((option, i) => (
                            option.trim() && (
                              <SelectItem key={i} value={i.toString()}>
                                {String.fromCharCode(65 + i)} - {option.slice(0, 30)}...
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ball</Label>
                      <Input
                        type="number"
                        value={questionForm.points}
                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                        min={1}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setQuestionDialogOpen(false);
                    resetQuestionForm();
                  }}>
                    {t('cancel')}
                  </Button>
                  <Button onClick={handleSaveQuestion} className="gap-2 gradient-primary border-0">
                    <Save className="h-4 w-4" />
                    {t('save')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Questions list */}
      <main className="test-container py-8">
        {questions.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Hozircha savollar yo'q</p>
              <Button onClick={() => handleOpenQuestionDialog()} className="gap-2 gradient-primary border-0">
                <Plus className="h-4 w-4" />
                Birinchi savolni qo'shing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5 cursor-grab" />
                      <Badge variant="outline" className="font-mono">
                        #{index + 1}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {question.image_url && (
                        <img 
                          src={question.image_url} 
                          alt="Question" 
                          className="max-h-32 rounded-lg border mb-3"
                        />
                      )}
                      <p className="font-medium mb-3">{question.question_text_uz}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(question.options as string[]).map((option, i) => (
                          <div
                            key={i}
                            className={`px-3 py-2 rounded-lg text-sm border ${
                              i === question.correct_option 
                                ? 'border-success bg-success/10 text-success' 
                                : 'border-muted'
                            }`}
                          >
                            <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{question.points} ball</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenQuestionDialog(question)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setQuestionToDelete(question);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Savolni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Bu savolni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TestEditor() {
  return (
    <LanguageProvider>
      <TestEditorContent />
    </LanguageProvider>
  );
}
