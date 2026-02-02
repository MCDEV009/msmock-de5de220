import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Question, TestAttempt, Test } from '@/types/test';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { ChevronLeft, ChevronRight, Clock, Flag, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function TestInterfaceContent() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<Map<string, { options: string[], mapping: number[] }>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const participantId = (location.state as { participantId?: string })?.participantId;

  // Fetch test data
  useEffect(() => {
    async function fetchData() {
      if (!attemptId) return;
      
      // Get attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
      
      if (attemptError || !attemptData) {
        toast.error(t('error'));
        navigate('/');
        return;
      }
      
      if (attemptData.status === 'finished') {
        navigate(`/results/${attemptId}`);
        return;
      }
      
      setAttempt(attemptData as TestAttempt);
      setAnswers((attemptData.answers as Record<string, number>) || {});
      
      // Get test
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', attemptData.test_id)
        .single();
      
      if (testData) {
        setTest(testData as Test);
        
        // Calculate remaining time
        const startedAt = new Date(attemptData.started_at).getTime();
        const duration = testData.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
        setTimeLeft(remaining);
      }
      
      // Get questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', attemptData.test_id)
        .order('order_index');
      
      if (questionsData) {
        let processedQuestions = questionsData as Question[];
        
        // Randomize questions if enabled
        if (testData?.randomize_questions) {
          processedQuestions = shuffleArray(processedQuestions);
        }
        
        // Create shuffled options mapping
        const optionsMap = new Map<string, { options: string[], mapping: number[] }>();
        processedQuestions.forEach((q) => {
          const options = q.options as string[];
          if (testData?.randomize_options) {
            const indices = options.map((_, i) => i);
            const shuffledIndices = shuffleArray(indices);
            optionsMap.set(q.id, {
              options: shuffledIndices.map(i => options[i]),
              mapping: shuffledIndices
            });
          } else {
            optionsMap.set(q.id, {
              options: options,
              mapping: options.map((_, i) => i)
            });
          }
        });
        
        setShuffledOptions(optionsMap);
        setQuestions(processedQuestions);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [attemptId, navigate, t]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 && !loading && attempt) {
      handleFinish(true);
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, loading, attempt]);

  // Auto-save every 5 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (attemptId && Object.keys(answers).length > 0) {
        supabase
          .from('test_attempts')
          .update({ answers })
          .eq('id', attemptId)
          .then(() => {});
      }
    }, 5000);
    
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [attemptId, answers]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Prevent page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSelectOption = (questionId: string, displayIndex: number) => {
    const optionData = shuffledOptions.get(questionId);
    if (!optionData) return;
    
    // Map display index back to original index
    const originalIndex = optionData.mapping[displayIndex];
    setAnswers((prev) => ({ ...prev, [questionId]: originalIndex }));
  };

  const handleFinish = async (autoSubmit = false) => {
    if (submitting) return;
    
    if (!autoSubmit) {
      setShowFinishDialog(true);
      return;
    }
    
    setSubmitting(true);
    
    // Calculate score
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) {
        correctCount++;
      }
    });
    
    try {
      await supabase
        .from('test_attempts')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          score: correctCount,
          correct_answers: correctCount,
          answers
        })
        .eq('id', attemptId);
      
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      
      navigate(`/results/${attemptId}`);
    } catch (error) {
      toast.error(t('error'));
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentOptions = currentQuestion ? shuffledOptions.get(currentQuestion.id) : null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentDisplayAnswer = currentAnswer !== undefined && currentOptions 
    ? currentOptions.mapping.indexOf(currentAnswer)
    : undefined;

  const questionText = currentQuestion ? (
    language === 'ru' && currentQuestion.question_text_ru ? currentQuestion.question_text_ru :
    language === 'en' && currentQuestion.question_text_en ? currentQuestion.question_text_en :
    currentQuestion.question_text_uz
  ) : '';

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="test-container">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant={timeLeft < 60 ? 'destructive' : 'secondary'} className="font-mono text-base px-3 py-1">
                <Clock className="h-4 w-4 mr-1.5" />
                {formatTime(timeLeft)}
              </Badge>
            </div>
            
            <div className="flex-1 max-w-xs hidden sm:block">
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => handleFinish(false)}
                variant="destructive"
                size="sm"
                className="gap-1.5"
              >
                <Flag className="h-4 w-4" />
                {t('finish')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Question navigation */}
      <div className="border-b bg-card/50">
        <div className="test-container py-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`
                  shrink-0 w-9 h-9 rounded-lg text-sm font-medium transition-all
                  ${i === currentIndex 
                    ? 'gradient-primary text-primary-foreground shadow-soft' 
                    : answers[q.id] !== undefined
                      ? 'bg-success/20 text-success border border-success/30'
                      : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 py-6">
        <div className="test-container">
          {currentQuestion && currentOptions && (
            <Card className="shadow-card animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="font-medium">
                    {t('question')} {currentIndex + 1} {t('of')} {questions.length}
                  </Badge>
                  <Badge variant="secondary">{currentQuestion.points} ball</Badge>
                </div>
                
                {currentQuestion.image_url && (
                  <div className="mb-6 rounded-lg overflow-hidden border">
                    <img 
                      src={currentQuestion.image_url} 
                      alt="Question" 
                      className="max-h-64 w-auto mx-auto"
                    />
                  </div>
                )}
                
                <p className="text-lg font-medium mb-6 whitespace-pre-wrap">
                  {questionText}
                </p>
                
                <div className="space-y-3">
                  {currentOptions.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(currentQuestion.id, i)}
                      className={`
                        w-full p-4 rounded-lg border-2 text-left transition-all
                        ${currentDisplayAnswer === i 
                          ? 'border-primary bg-primary/5 shadow-soft' 
                          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold mr-3">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="gap-2 gradient-primary border-0"
              >
                {t('next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleFinish(false)}
                variant="destructive"
                className="gap-2"
              >
                <Flag className="h-4 w-4" />
                {t('finish')}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Finish confirmation dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finish')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmFinish')}
              <br />
              <span className="font-medium">
                {answeredCount}/{questions.length} ta savolga javob berildi
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleFinish(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('finish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TestInterface() {
  return (
    <LanguageProvider>
      <TestInterfaceContent />
    </LanguageProvider>
  );
}
