import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Info, Loader2 } from 'lucide-react';

interface FieldError {
  email: string;
  password: string;
}

interface Touched {
  email: boolean;
  password: boolean;
}

function validateEmail(v: string): string {
  const val = v.trim();
  if (!val) return 'Adresse email requise';
  if (val.length > 255) return 'Email trop long';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Format email invalide (ex: nom@domaine.com)';
  return '';
}

function validatePassword(v: string): string {
  if (!v) return 'Mot de passe requis';
  if (v.length < 6) return 'Minimum 6 caracteres';
  if (v.length > 128) return 'Maximum 128 caracteres';
  return '';
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldError>({ email: '', password: '' });
  const [touched, setTouched] = useState<Touched>({ email: false, password: false });
  const [shake, setShake] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } return; }
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setServerError(''); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [cooldown > 0]);

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s < 10 ? '0' : ''}${s}s` : `${s}s`;
  };

  const fieldError = (field: 'email' | 'password'): string => {
    if (!touched[field]) return '';
    return errors[field];
  };

  const hasError = (field: 'email' | 'password'): boolean => {
    return touched[field] && errors[field] !== '';
  };

  const blurEmail = useCallback(() => {
    setTouched((t) => ({ ...t, email: true }));
    setErrors((e) => ({ ...e, email: validateEmail(email) }));
  }, [email]);

  const blurPassword = useCallback(() => {
    setTouched((t) => ({ ...t, password: true }));
    setErrors((e) => ({ ...e, password: validatePassword(password) }));
  }, [password]);

  const changeEmail = (val: string) => {
    setEmail(val);
    setServerError('');
    if (touched.email) {
      setErrors((e) => ({ ...e, email: validateEmail(val) }));
    }
  };

  const changePassword = (val: string) => {
    setPassword(val);
    setServerError('');
    if (touched.password) {
      setErrors((e) => ({ ...e, password: validatePassword(val) }));
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setErrors({ email: emailErr, password: passwordErr });
    setTouched({ email: true, password: true });

    if (emailErr || passwordErr) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/articles');
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? '';
      const status: number = err.response?.status;

      if (status === 400) {
        if (msg.toLowerCase().includes('email')) {
          setErrors((e) => ({ ...e, email: msg }));
          setTouched((t) => ({ ...t, email: true }));
        } else if (msg.toLowerCase().includes('mot de passe')) {
          setErrors((e) => ({ ...e, password: msg }));
          setTouched((t) => ({ ...t, password: true }));
        } else {
          setServerError(msg || 'Donnees invalides');
        }
      } else if (status === 401) {
        setServerError('Email ou mot de passe incorrect');
      } else if (status === 429) {
        const resetHeader = err.response?.headers?.['ratelimit-reset'] ?? err.response?.headers?.['x-ratelimit-reset'] ?? err.response?.headers?.['retry-after'];
        let waitSecs = 15 * 60;
        if (resetHeader) {
          const resetTs = Number(resetHeader);
          if (resetTs > 0) {
            const now = Math.floor(Date.now() / 1000);
            waitSecs = resetTs > 1000000 ? Math.max(1, resetTs - now) : resetTs;
          }
        }
        setCooldown(waitSecs);
        setServerError(`Trop de tentatives. Reessayez dans ${formatCooldown(waitSecs)}.`);
      } else if (err.code === 'ERR_NETWORK') {
        setServerError('Serveur indisponible. Verifiez votre connexion.');
      } else {
        setServerError(msg || 'Erreur inattendue. Reessayez.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full py-2.5 rounded-xl border bg-gray-50/50 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all duration-200 focus:bg-white focus:ring-4';

  const inputNormal = `${inputBase} border-gray-200 focus:border-blue-500 focus:ring-blue-500/10`;
  const inputErrorStyle = `${inputBase} border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10`;

  return (
    <div className="flex min-h-screen">
      {/* Left: branding panel */}
      <div className="hidden relative w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-center lg:items-center bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
        {/* subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-10 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-blue-400 rounded-full animate-float" />
        <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-indigo-300 rounded-full animate-float delay-200" />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-white/40 rounded-full animate-float delay-400" />

        <div className="relative z-10 text-center px-12 animate-fade-in-up">
          <div className="mx-auto mb-8 flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Everience</h1>
          <p className="text-lg text-blue-200/80 max-w-md leading-relaxed">
            Gestion intelligente de stock, commandes et fournisseurs
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Stock</div>
              <div className="text-xs text-blue-300/60 mt-1">Suivi reel</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Pack</div>
              <div className="text-xs text-blue-300/60 mt-1">Groupement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Cmd</div>
              <div className="text-xs text-blue-300/60 mt-1">Automatise</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 sm:px-12 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in-up delay-100">
          {/* mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Everience</h1>
          </div>

          {/* card */}
          <div className={cn('bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 sm:p-10', shake && 'animate-shake')}>
            <div className="mb-8 animate-fade-in-up delay-200">
              <h2 className="text-2xl font-bold text-gray-900">Bienvenue</h2>
              <p className="mt-2 text-sm text-gray-500">Connectez-vous pour continuer</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* email */}
              <div className="animate-fade-in-up delay-200">
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className={cn('w-5 h-5 transition-colors', hasError('email') ? 'text-red-400' : 'text-gray-400')} />
                  </div>
                  <input
                    id="login-email"
                    type="text"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => changeEmail(e.target.value)}
                    onBlur={blurEmail}
                    placeholder="admin@everience.com"
                    className={cn(hasError('email') ? inputErrorStyle : inputNormal, 'pl-11 pr-4')}
                  />
                </div>
                {fieldError('email') && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 animate-fade-in">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {fieldError('email')}
                  </p>
                )}
              </div>

              {/* password */}
              <div className="animate-fade-in-up delay-300">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className={cn('w-5 h-5 transition-colors', hasError('password') ? 'text-red-400' : 'text-gray-400')} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => changePassword(e.target.value)}
                    onBlur={blurPassword}
                    placeholder="Entrez votre mot de passe"
                    className={cn(hasError('password') ? inputErrorStyle : inputNormal, 'pl-11 pr-11')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldError('password') && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 animate-fade-in">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {fieldError('password')}
                  </p>
                )}
              </div>

              {/* server error */}
              {serverError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">
                    {cooldown > 0 ? (
                      <>Trop de tentatives. Reessayez dans <span className="font-semibold tabular-nums">{formatCooldown(cooldown)}</span>.</>
                    ) : (
                      serverError
                    )}
                  </p>
                </div>
              )}

              {/* submit */}
              <div className="animate-fade-in-up delay-400">
                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="relative w-full py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 overflow-hidden"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connexion en cours...
                    </span>
                  ) : cooldown > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4" />
                      Reessayez dans {formatCooldown(cooldown)}
                    </span>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </div>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 animate-fade-in-up delay-400">
            Everience &mdash; Gestion de stock
          </p>
        </div>
      </div>
    </div>
  );
}
