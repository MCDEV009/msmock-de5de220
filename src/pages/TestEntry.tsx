import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Test } from '@/types/test';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExamRulesModal } from '@/components/test/ExamRulesModal';
import { ArrowRight, User, Clock, FileQuestion, Copy, CheckCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

function generateParticipantId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function TestEntryContent() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [participantId] = useState(generateParticipantId());
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    async function fetchTest() {
      // Check if testId is a UUID or a 5-digit code
      let query = supabase.from('tests').select('*, subjects(*)');
      
      if (testId?.length === 5 && /^\d{5}$/.test(testId)) {
        query = query.eq('test_code', testId);
      } else {
        query = query.eq('id', testId);
      }
      
      const { data, error } = await query.single();
      
      if (!error && data) {
        setTest(data as Test);
        
        // Get question count
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', data.id);
        setQuestionCount(count || 0);
      }
      setLoading(false);
    }

    fetchTest();
  }, [testId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(participantId);
    setCopied(true);
    toast.success("ID nusxalandi!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceed = () => {
    if (!fullName.trim()) {
      toast.error(t('enterFullName'));
      return;
    }
    setShowRulesModal(true);
  };

  const handleStartTest = async () => {
    if (!fullName.trim() || !test) return;
    
    setSubmitting(true);
    
    try {
      // Create participant
      const { error: participantError } = await supabase
        .from('test_participants')
        .insert({
          participant_id: participantId,
          full_name: fullName.trim()
        });
      
      if (participantError) throw participantError;
      
      // Create test attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          test_id: test.id,
          participant_id: participantId,
          total_questions: questionCount,
          status: 'in_progress'
        })
        .select()
        .single();
      
      if (attemptError) throw attemptError;
      
      // Navigate to test
      navigate(`/test/${attempt.id}`, { 
        state: { 
          participantId,
          fullName: fullName.trim()
        }
      });
    } catch (error) {
      console.error('Error starting test:', error);
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const title = test ? (
    language === 'ru' && test.title_ru ? test.title_ru :
    language === 'en' && test.title_en ? test.title_en : test.title_uz
  ) : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4 shadow-card">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{t('testNotFound')}</p>
              <Button onClick={() => navigate('/')}>{t('backToHome')}</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-elevated animate-scale-in">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              {test.test_format === 'milliy_sertifikat' && (
                <Badge variant="default" className="gap-1">
                  <Award className="h-3 w-3" />
                  Milliy Sertifikat
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {test.duration_minutes} {t('minutes')}
              </span>
              <span className="flex items-center gap-1">
                <FileQuestion className="h-4 w-4" />
                {questionCount} {t('questions')}
              </span>
            </CardDescription>
            {test.test_format === 'milliy_sertifikat' && (
              <p className="text-xs text-muted-foreground mt-2">
                1-35: Test savollari (1 ball) • 36-45: Yozma savollar (0-2 ball)
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('fullName')}
              </Label>
              <Input
                id="fullName"
                placeholder={t('enterFullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleProceed()}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('yourId')}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-mono text-lg tracking-wider text-center select-all">
                  {participantId}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyId}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Bu IDni saqlang - natijalaringizni ko'rish uchun kerak bo'ladi
              </p>
            </div>

            <Button
              onClick={handleProceed}
              disabled={!fullName.trim() || submitting}
              className="w-full h-12 text-lg gradient-primary border-0 shadow-soft hover:shadow-glow transition-shadow"
            >
              {submitting ? t('loading') : t('startTest')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>

      <ExamRulesModal
        open={showRulesModal}
        onAccept={handleStartTest}
        testTitle={title}
        duration={test.duration_minutes}
        questionCount={questionCount}
        isMilliySertifikat={test.test_format === 'milliy_sertifikat'}
      />
    </div>
  );
}

export default function TestEntry() {
  return (
    <LanguageProvider>
      <TestEntryContent />
    </LanguageProvider>
  );
}
