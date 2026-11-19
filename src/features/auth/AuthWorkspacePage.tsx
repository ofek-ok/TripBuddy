import React, { useState } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives';
import { AppLogo } from '@/components/shared/AppLogo';
import { CURRENCIES } from '@/lib/utils/formatters';
import { CurrencyCode } from '@/types/database.types';
import {
  Check,
  Copy,
  Globe,
  HeartHandshake,
  KeyRound,
  LogOut,
  Plus,
  Sparkles,
  UserPlus,
} from 'lucide-react';

export const AuthWorkspacePage: React.FC<{ manageMode?: boolean }> = ({ manageMode = false }) => {
  const { lang, setLang, t } = useI18n();
  const {
    currentUser,
    currentCouple,
    coupleMembers,
    signIn,
    signUp,
    signOut,
    createCoupleWorkspace,
    joinCoupleWorkspace,
    addPartnerProfile,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [authTab, setAuthTab] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [workspaceTab, setWorkspaceTab] = useState<'create' | 'join'>('create');
  const [workspaceName, setWorkspaceName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('EUR');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Partner addition in workspace settings
  const [partnerName, setPartnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authTab === 'signUp') {
        if (!fullName.trim()) throw new Error('Full name is required');
        await signUp(email, password, fullName);
        notify(lang === 'he' ? 'החשבון נוצר בהצלחה!' : 'Account created!', 'success');
      } else {
        await signIn(email, password);
        notify(lang === 'he' ? 'התחברת בהצלחה!' : 'Signed in successfully!', 'success');
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleCreateCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!workspaceName.trim()) throw new Error('Workspace name is required');
      await createCoupleWorkspace(workspaceName, defaultCurrency);
      notify(
        lang === 'he' ? 'סביבת העבודה הוקמה בהצלחה!' : 'Workspace created!',
        'success'
      );
    } catch (err) {
      handleError(err);
    }
  };

  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!inviteCodeInput.trim()) throw new Error('Invite code is required');
      await joinCoupleWorkspace(inviteCodeInput);
      notify(
        lang === 'he' ? 'הצטרפת לסביבת העבודה!' : 'Joined workspace!',
        'success'
      );
    } catch (err) {
      handleError(err);
    }
  };

  const handleCopyInviteCode = () => {
    if (!currentCouple) return;
    navigator.clipboard.writeText(currentCouple.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) return;
    try {
      await addPartnerProfile(partnerName, partnerEmail);
      setPartnerName('');
      setPartnerEmail('');
      notify(lang === 'he' ? 'בן/בת הזוג נוספו לסביבה!' : 'Partner added!', 'success');
    } catch (err) {
      handleError(err);
    }
  };

  // 1. Not logged in -> Show clean Mobile-First Auth Screen
  if (!currentUser) {
    return (
      <div className="min-h-dvh bg-ivory flex flex-col justify-center px-4 py-10">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppLogo size="lg" />
              <div>
                <h1 className="font-bold text-lg text-navy">{t.appName}</h1>
                <p className="text-xs text-navy/60">{t.tagline}</p>
              </div>
            </div>
            <button
              onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
              className="px-3 py-1.5 rounded-xl bg-surface border border-navy/10 text-xs font-semibold flex items-center gap-1.5 hover:bg-navy/5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sand" />
              <span>{lang === 'he' ? 'English' : 'עברית'}</span>
            </button>
          </div>

          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-navy">{t.auth.welcomeTitle}</h2>
              <p className="text-xs text-navy/65 mt-1">{t.auth.welcomeSubtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-xl">
              <button
                type="button"
                onClick={() => setAuthTab('signUp')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'signUp' ? 'bg-navy text-white shadow-xs' : 'text-navy/70'
                }`}
              >
                {t.auth.signUp}
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signIn')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  authTab === 'signIn' ? 'bg-navy text-white shadow-xs' : 'text-navy/70'
                }`}
              >
                {t.auth.signIn}
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authTab === 'signUp' && (
                <Input
                  label={t.auth.fullName}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === 'he' ? 'למשל: אופק' : 'e.g., Alex'}
                />
              )}
              <Input
                label={t.auth.email}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <Input
                label={t.auth.password}
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button type="submit" className="w-full" size="lg">
                {authTab === 'signUp' ? t.auth.signUp : t.auth.signIn}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // 2. Logged in, but not yet part of a Couple Workspace -> Show Couple Onboarding
  if (!currentCouple) {
    return (
      <div className="min-h-dvh bg-ivory flex flex-col justify-center px-4 py-10">
        <div className="max-w-md w-full mx-auto space-y-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sand/20 text-sand flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">
                  {lang === 'he'
                    ? `שלום ${currentUser.full_name}!`
                    : `Hello ${currentUser.full_name}!`}
                </h2>
                <p className="text-xs text-navy/65">{t.auth.welcomeSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-ivory rounded-xl">
              <button
                type="button"
                onClick={() => setWorkspaceTab('create')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  workspaceTab === 'create' ? 'bg-navy text-white' : 'text-navy/70'
                }`}
              >
                {t.auth.createCoupleTitle}
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab('join')}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  workspaceTab === 'join' ? 'bg-navy text-white' : 'text-navy/70'
                }`}
              >
                {t.auth.joinCoupleTitle}
              </button>
            </div>

            {workspaceTab === 'create' ? (
              <form onSubmit={handleCreateCouple} className="space-y-4">
                <Input
                  label={t.auth.workspaceName}
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder={lang === 'he' ? 'המסעות שלנו' : 'Our Journeys'}
                />
                <Select
                  label={t.common.currency}
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {lang === 'he' ? c.labelHe : c.labelEn}
                    </option>
                  ))}
                </Select>
                <Button type="submit" className="w-full" size="lg">
                  <Sparkles className="w-4 h-4" />
                  <span>{t.auth.createCoupleTitle}</span>
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoinCouple} className="space-y-4">
                <Input
                  label={t.auth.inviteCode}
                  required
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                />
                <Button type="submit" className="w-full" size="lg">
                  <KeyRound className="w-4 h-4" />
                  <span>{t.auth.joinCoupleTitle}</span>
                </Button>
              </form>
            )}

            <div className="pt-3 border-t border-navy/10 flex justify-between items-center text-xs">
              <span className="text-navy/60">{currentUser.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="text-red-600 font-semibold hover:underline"
              >
                {t.common.logout}
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 3. Manage Couple Workspace Page (inside AppShell when manageMode=true)
  if (!manageMode) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">{t.nav.settings}</h1>
          <p className="text-sm text-navy/65">{currentCouple.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          <span>{t.common.logout}</span>
        </Button>
      </div>

      {/* Invite Code Card */}
      <Card className="space-y-3 border-sand/40 bg-gradient-to-br from-surface to-ivory/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-sand" />
            <h2 className="font-bold text-base">{t.auth.inviteCode}</h2>
          </div>
          <Badge variant="sage">Couple Workspace</Badge>
        </div>
        <p className="text-xs text-navy/70">{t.auth.invitePartnerDesc}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-12 rounded-xl bg-ivory border border-navy/15 flex items-center justify-center font-mono text-lg font-bold tracking-widest text-navy">
            {currentCouple.invite_code}
          </div>
          <Button variant="sand" onClick={handleCopyInviteCode}>
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? t.auth.copied : t.auth.copyInviteCode}</span>
          </Button>
        </div>
      </Card>

      {/* Couple Members List */}
      <Card className="space-y-4">
        <h3 className="font-bold text-base">
          {lang === 'he' ? 'בני הזוג בסביבת העבודה' : 'Couple Workspace Members'} (
          {coupleMembers.length})
        </h3>
        <div className="divide-y divide-navy/10">
          {coupleMembers.map((cm) => (
            <div key={cm.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm">
                  {(cm.profile?.full_name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm">{cm.profile?.full_name}</div>
                  <div className="text-xs text-navy/60">
                    {cm.profile?.email || (lang === 'he' ? 'שותף/ה לטיול' : 'Travel Partner')}
                  </div>
                </div>
              </div>
              <Badge variant={cm.role === 'owner' ? 'navy' : 'sage'}>{cm.role}</Badge>
            </div>
          ))}
        </div>

        {coupleMembers.length < 2 && (
          <form
            onSubmit={handleAddPartner}
            className="pt-4 border-t border-navy/10 space-y-3"
          >
            <div className="text-xs font-semibold text-navy/80 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-sand" />
              <span>
                {lang === 'he'
                  ? 'הוספת פרופיל בן/בת הזוג לשיוך משימות והוצאות (או שיצטרפו עם הקוד למעלה):'
                  : 'Add partner profile for assigning tasks & expenses (or have them join via code above):'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder={lang === 'he' ? 'שם בן/בת הזוג' : 'Partner Name'}
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder={lang === 'he' ? 'אימייל (אופציונלי)' : 'Email (Optional)'}
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              <Plus className="w-4 h-4" />
              <span>{lang === 'he' ? 'הוספת בן/בת זוג' : 'Add Partner'}</span>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
