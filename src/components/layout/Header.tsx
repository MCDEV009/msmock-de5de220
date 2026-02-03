import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Button } from '@/components/ui/button';
import { GraduationCap, Settings, LogIn } from 'lucide-react';

export function Header() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="test-container">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-soft group-hover:shadow-glow transition-shadow">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-tight">Milliy Sertifikat</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Mock Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin')}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/auth')}
              className="gap-2 gradient-primary border-0 shadow-soft hover:shadow-glow transition-shadow"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">{t('login')}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
