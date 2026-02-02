import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Question, TestAttempt, Test } from '@/types/test';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Trophy, CheckCircle, XCircle, Home, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

function ResultsContent() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      if (!attemptId) return;
      
      const { data: attemptData, error } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
      
      if (error || !attemptData) {
        navigate('/');
        return;
      }
      
      setAttempt(attemptData as TestAttempt);
      
      const { data: testData } = await supabase
        .from('tests')
        .select('*')
        .eq('id', attemptData.test_id)
        .single();
      
      if (testData) {
        setTest(testData as Test);
      }
      
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', attemptData.test_id)
        .order('order_index');
      
      if (questionsData) {
        setQuestions(questionsData as Question[]);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [attemptId, navigate]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map(q => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (!attempt || !test) {
    return null;
  }

  const percentage = attempt.total_questions > 0 
    ? Math.round((attempt.correct_answers / attempt.total_questions) * 100) 
    : 0;

  const title = language === 'ru' && test.title_ru ? test.title_ru :
                language === 'en' && test.title_en ? test.title_en : test.title_uz;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="test-container">
          {/* Score card */}
          <Card className="shadow-elevated mb-8 overflow-hidden">
            <div className={`p-1 ${percentage >= 60 ? 'gradient-accent' : 'bg-destructive'}`} />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Trophy className={`h-10 w-10 ${percentage >= 60 ? 'text-accent' : 'text-destructive'}`} />
              </div>
              <CardTitle className="text-2xl">{t('testFinished')}</CardTitle>
              <p className="text-muted-foreground">{title}</p>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold">{attempt.correct_answers}</div>
                  <div className="text-sm text-muted-foreground">{t('correct')}</div>
                </div>
                <Separator orientation="vertical" className="h-16" />
                <div className="text-center">
                  <div className="text-4xl font-bold">{attempt.total_questions - attempt.correct_answers}</div>
                  <div className="text-sm text-muted-foreground">{t('incorrect')}</div>
                </div>
                <Separator orientation="vertical" className="h-16" />
                <div className="text-center">
                  <div className="text-4xl font-bold">{percentage}%</div>
                  <div className="text-sm text-muted-foreground">{t('score')}</div>
                </div>
              </div>
              
              <Progress 
                value={percentage} 
                className={`h-3 ${percentage >= 60 ? '' : '[&>div]:bg-destructive'}`}
              />
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  {t('backToHome')}
                </Button>
                {test.allow_retry && (
                  <Button 
                    onClick={() => navigate(`/enter/${test.id}`)}
                    className="gap-2 gradient-primary border-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('retakeTest')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Question review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('questions')} ({questions.length})</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Barchasini ochish
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Barchasini yopish
                </Button>
              </div>
            </div>
            
            {questions.map((question, index) => {
              const userAnswer = (attempt.answers as Record<string, number>)?.[question.id];
              const isCorrect = userAnswer === question.correct_option;
              const isExpanded = expandedQuestions.has(question.id);
              const options = question.options as string[];
              
              const questionText = language === 'ru' && question.question_text_ru ? question.question_text_ru :
                                   language === 'en' && question.question_text_en ? question.question_text_en :
                                   question.question_text_uz;

              return (
                <Card 
                  key={question.id} 
                  className={`overflow-hidden transition-all ${isCorrect ? 'border-success/30' : 'border-destructive/30'}`}
                >
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${isCorrect ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}
                    `}>
                      {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">#{index + 1}</Badge>
                        <span className="truncate font-medium">{questionText}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-3 animate-fade-in">
                      {question.image_url && (
                        <img 
                          src={question.image_url} 
                          alt="Question" 
                          className="max-h-48 rounded-lg border"
                        />
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{questionText}</p>
                      
                      <div className="space-y-2">
                        {options.map((option, i) => {
                          const isUserAnswer = userAnswer === i;
                          const isCorrectAnswer = question.correct_option === i;
                          
                          return (
                            <div
                              key={i}
                              className={`
                                p-3 rounded-lg border-2 text-sm
                                ${isCorrectAnswer 
                                  ? 'border-success bg-success/10' 
                                  : isUserAnswer && !isCorrectAnswer
                                    ? 'border-destructive bg-destructive/10'
                                    : 'border-muted'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="flex-1">{option}</span>
                                {isCorrectAnswer && <Badge variant="secondary" className="bg-success/20 text-success">{t('correctAnswer')}</Badge>}
                                {isUserAnswer && !isCorrectAnswer && <Badge variant="secondary" className="bg-destructive/20 text-destructive">{t('yourAnswer')}</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Results() {
  return (
    <LanguageProvider>
      <ResultsContent />
    </LanguageProvider>
  );
}
