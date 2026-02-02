import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';

export function HeroSection() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [testCode, setTestCode] = useState('');

  const handlePrivateTest = () => {
    if (testCode.length === 5) {
      navigate(`/enter/${testCode}`);
    }
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="test-container">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Online Test Platformasi
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6 text-balance">
            {t('heroTitle')}
          </h1>

          <p className="text-xl text-muted-foreground mb-10 text-balance">
            {t('heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate('/tests')}
              className="gradient-primary border-0 shadow-soft hover:shadow-glow transition-all text-lg px-8 h-14"
            >
              {t('publicTests')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Private test code entry */}
          <Card className="mx-auto max-w-md p-6 shadow-card border-2 border-dashed border-muted-foreground/20">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">{t('privateTest')}</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('enterTestCode5')}
                value={testCode}
                onChange={(e) => setTestCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="text-center text-lg font-mono tracking-widest"
                maxLength={5}
              />
              <Button
                onClick={handlePrivateTest}
                disabled={testCode.length !== 5}
                className="gradient-accent border-0 text-accent-foreground"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
