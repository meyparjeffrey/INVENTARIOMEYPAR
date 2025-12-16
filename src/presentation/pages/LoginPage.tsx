import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label } from '../components/ui';
import { LanguageSelector } from '../components/ui/LanguageSelector';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { ConnectionStatus } from '../components/ui/ConnectionStatus';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/cn';

/**
 * Versión de la aplicación mostrada al usuario.
 *
 * Nota: Se mantiene en sincronía con `package.json` (versión usada en el build Windows).
 */
const APP_VERSION = '0.5.0';

/**
 * Pantalla de inicio de sesión moderna y profesional con diseño de dos columnas.
 * Izquierda: Logo, nombre de la aplicación, versión y características.
 * Derecha: Formulario de inicio de sesión.
 */
export function LoginPage() {
  const { t } = useLanguage();
  const { login, authContext, loading: authLoading } = useAuth();
  const { effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberSession, setRememberSession] = React.useState(false); // Desmarcado por defecto
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(new Set());

  // Partículas estáticas (useMemo para evitar re-renders)
  const particles = React.useMemo(
    () =>
      [...Array(6)].map((_, i) => ({
        id: i,
        width: Math.random() * 200 + 100,
        height: Math.random() * 200 + 100,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 4 + Math.random() * 2,
        delay: Math.random() * 2,
      })),
    [],
  );

  // Redirigir si ya está autenticado
  // SEGURIDAD: Solo redirigir si hay un authContext válido (ya verificado por AuthContext)
  React.useEffect(() => {
    if (!authLoading && authContext) {
      navigate('/dashboard', { replace: true });
    }
  }, [authContext, authLoading, navigate]);

  // Validación de campos
  const validateField = (field: 'email' | 'password', value: string): string | null => {
    if (field === 'email') {
      if (!value.trim()) {
        return t('login.error.emailRequired');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return t('login.error.emailInvalid');
      }
    }
    if (field === 'password') {
      if (!value) {
        return t('login.error.passwordRequired');
      }
      if (value.length < 6) {
        return t('login.error.passwordMinLength');
      }
    }
    return null;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouchedFields((prev) => new Set(prev).add(field));
    const value = field === 'email' ? email : password;
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const handleChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (touchedFields.has(field)) {
      const error = validateField(field, value);
      setFieldErrors((prev) => ({ ...prev, [field]: error || undefined }));
    }
    // Limpiar error general
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validar todos los campos
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);

    if (emailError || passwordError) {
      setFieldErrors({
        email: emailError || undefined,
        password: passwordError || undefined,
      });
      setTouchedFields(new Set(['email', 'password']));
      return;
    }

    setLoading(true);
    try {
      await login(email, password, rememberSession);
      setSuccess(true);
      // Esperar un momento para mostrar el mensaje de éxito con animación
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // Transición suave con fade out antes de navegar
      const transitionElement = document.querySelector('.login-container');
      if (transitionElement) {
        transitionElement.classList.add('opacity-0', 'scale-95');
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      let errorMessage = t('login.error');

      if (err instanceof Error) {
        // Traducir errores comunes de Supabase
        const errorMsg = err.message.toLowerCase();
        if (
          errorMsg.includes('invalid') ||
          errorMsg.includes('credentials') ||
          errorMsg.includes('email') ||
          errorMsg.includes('password')
        ) {
          errorMessage = t('login.error.invalidCredentials');
        } else if (
          errorMsg.includes('network') ||
          errorMsg.includes('connection') ||
          errorMsg.includes('fetch')
        ) {
          errorMessage = t('login.error.network');
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="login-container flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300"
      initial={{ opacity: 1 }}
      animate={{ opacity: success ? 0 : 1, scale: success ? 0.95 : 1 }}
    >
      {/* Columna Izquierda - Branding y Características */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
      >
        {/* Fondo con gradiente animado */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-purple-500/5 to-blue-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />

        {/* Partículas flotantes animadas - ESTÁTICAS (no cambian al hacer clic) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-primary-500/20 blur-xl"
              style={{
                width: particle.width,
                height: particle.height,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-md">
          {/* Logo SVG - Logo2 en modo oscuro */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -5, 0], // Movimiento sutil "vivo"
            }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              y: {
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            className="w-full max-w-xs"
          >
            {effectiveTheme === 'dark' ? (
              // Logo2.svg para modo oscuro (blanco)
              <svg
                viewBox="0 0 1190.55 377.973"
                className="w-full h-auto drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <g>
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 311.558594 209.234375 L 401.433594 209.234375 L 401.433594 163.921875 L 311.558594 163.921875 L 311.558594 119.109375 L 414.386719 119.109375 L 414.386719 73.796875 L 262.167969 73.796875 L 262.167969 305.324219 L 417.523438 305.324219 L 417.523438 260.023438 L 311.558594 260.023438 Z M 311.558594 209.234375 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 525.578125 162.296875 L 483.460938 73.796875 L 426.664062 73.796875 L 499.972656 221.140625 L 499.972656 305.324219 L 549.363281 305.324219 L 549.363281 221.140625 L 622.664062 73.796875 L 567.109375 73.796875 Z M 525.578125 162.296875 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 752.769531 164.78125 C 752.769531 171.242188 747.53125 176.484375 741.066406 176.484375 L 684.484375 176.484375 L 684.484375 119.113281 L 741.066406 119.113281 C 747.53125 119.113281 752.769531 124.347656 752.769531 130.816406 Z M 755.335938 73.796875 L 635.097656 73.796875 L 635.097656 305.328125 L 684.484375 305.328125 L 684.484375 221.136719 L 755.335938 221.136719 C 781.195312 221.136719 802.160156 200.171875 802.160156 174.316406 L 802.160156 120.621094 C 802.160156 94.757812 781.195312 73.796875 755.335938 73.796875 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 1056.84375 119.113281 L 1113.421875 119.113281 C 1119.886719 119.113281 1125.125 124.347656 1125.125 130.816406 L 1125.125 164.78125 C 1125.125 171.242188 1119.886719 176.484375 1113.421875 176.484375 L 1056.84375 176.484375 Z M 1184.941406 305.328125 L 1143.40625 218.378906 C 1161.523438 211.914062 1174.515625 194.652344 1174.515625 174.316406 L 1174.515625 120.621094 C 1174.515625 94.761719 1153.554688 73.800781 1127.691406 73.800781 L 1007.453125 73.800781 L 1007.453125 305.328125 L 1056.84375 305.328125 L 1056.84375 221.136719 L 1090.765625 221.136719 L 1130.980469 305.328125 Z M 1184.941406 305.328125 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 913.6875 217.621094 L 884.558594 125.070312 L 883.921875 125.070312 L 854.460938 217.621094 Z M 995.246094 305.328125 L 942.160156 305.328125 L 927.59375 257.429688 L 841.851562 257.429688 L 825.34375 305.328125 L 774.210938 305.328125 L 856.734375 72.648438 L 913.03125 72.648438 Z M 995.246094 305.328125 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 149.238281 73.652344 L 121.0625 206.546875 L 93.988281 73.652344 L 5.613281 73.652344 L 5.613281 305.328125 L 54.71875 305.328125 L 54.71875 118.574219 L 95.605469 305.328125 L 145 305.328125 L 188.507812 116.371094 L 188.507812 305.328125 L 237.613281 305.328125 L 237.613281 73.652344 Z M 149.238281 73.652344 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 237.613281 5.695312 L 5.609375 5.695312 L 5.609375 39.421875 L 237.613281 39.421875 Z M 237.613281 5.695312 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#ffffff"
                      fillOpacity="1"
                      d="M 237.613281 338.550781 L 5.609375 338.550781 L 5.609375 372.277344 L 237.613281 372.277344 Z M 237.613281 338.550781 "
                    />
                  </g>
                </g>
              </svg>
            ) : (
              // Logo normal para modo claro
              <svg
                viewBox="0 0 1190.55 377.973"
                className="w-full h-auto drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <g>
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 311.558594 209.234375 L 401.433594 209.234375 L 401.433594 163.921875 L 311.558594 163.921875 L 311.558594 119.109375 L 414.386719 119.109375 L 414.386719 73.796875 L 262.167969 73.796875 L 262.167969 305.324219 L 417.523438 305.324219 L 417.523438 260.023438 L 311.558594 260.023438 Z M 311.558594 209.234375 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 525.578125 162.296875 L 483.460938 73.796875 L 426.664062 73.796875 L 499.972656 221.140625 L 499.972656 305.324219 L 549.363281 305.324219 L 549.363281 221.140625 L 622.664062 73.796875 L 567.109375 73.796875 Z M 525.578125 162.296875 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 752.769531 164.78125 C 752.769531 171.242188 747.53125 176.484375 741.066406 176.484375 L 684.484375 176.484375 L 684.484375 119.113281 L 741.066406 119.113281 C 747.53125 119.113281 752.769531 124.347656 752.769531 130.816406 Z M 755.335938 73.796875 L 635.097656 73.796875 L 635.097656 305.328125 L 684.484375 305.328125 L 684.484375 221.136719 L 755.335938 221.136719 C 781.195312 221.136719 802.160156 200.171875 802.160156 174.316406 L 802.160156 120.621094 C 802.160156 94.757812 781.195312 73.796875 755.335938 73.796875 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 1056.84375 119.113281 L 1113.421875 119.113281 C 1119.886719 119.113281 1125.125 124.347656 1125.125 130.816406 L 1125.125 164.78125 C 1125.125 171.242188 1119.886719 176.484375 1113.421875 176.484375 L 1056.84375 176.484375 Z M 1184.941406 305.328125 L 1143.40625 218.378906 C 1161.523438 211.914062 1174.515625 194.652344 1174.515625 174.316406 L 1174.515625 120.621094 C 1174.515625 94.761719 1153.554688 73.800781 1127.691406 73.800781 L 1007.453125 73.800781 L 1007.453125 305.328125 L 1056.84375 305.328125 L 1056.84375 221.136719 L 1090.765625 221.136719 L 1130.980469 305.328125 Z M 1184.941406 305.328125 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 913.6875 217.621094 L 884.558594 125.070312 L 883.921875 125.070312 L 854.460938 217.621094 Z M 995.246094 305.328125 L 942.160156 305.328125 L 927.59375 257.429688 L 841.851562 257.429688 L 825.34375 305.328125 L 774.210938 305.328125 L 856.734375 72.648438 L 913.03125 72.648438 Z M 995.246094 305.328125 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#020202"
                      fillOpacity="1"
                      d="M 149.238281 73.652344 L 121.0625 206.546875 L 93.988281 73.652344 L 5.613281 73.652344 L 5.613281 305.328125 L 54.71875 305.328125 L 54.71875 118.574219 L 95.605469 305.328125 L 145 305.328125 L 188.507812 116.371094 L 188.507812 305.328125 L 237.613281 305.328125 L 237.613281 73.652344 Z M 149.238281 73.652344 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#e62144"
                      fillOpacity="1"
                      d="M 237.613281 5.695312 L 5.609375 5.695312 L 5.609375 39.421875 L 237.613281 39.421875 Z M 237.613281 5.695312 "
                    />
                    <path
                      fillRule="nonzero"
                      fill="#7f7f7f"
                      fillOpacity="1"
                      d="M 237.613281 338.550781 L 5.609375 338.550781 L 5.609375 372.277344 L 237.613281 372.277344 Z M 237.613281 338.550781 "
                    />
                  </g>
                </g>
              </svg>
            )}
          </motion.div>

          {/* Nombre de la aplicación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {t('app.name')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {t('app.subtitle')}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{t('login.version')}</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                v{APP_VERSION}
              </span>
            </div>
          </motion.div>

          {/* Características destacadas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="grid grid-cols-1 gap-4 w-full mt-8"
          >
            {[
              { icon: Shield, text: t('login.feature.secure') },
              { icon: Zap, text: t('login.feature.fast') },
              { icon: TrendingUp, text: t('login.feature.control') },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Columna Derecha - Formulario de Login */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative"
        style={{ zIndex: 1 }}
      >
        {/* Controles superiores mejorados */}
        <div
          className="absolute top-4 right-4 lg:top-6 lg:right-6 flex items-center gap-3"
          style={{ zIndex: 200 }}
        >
          {/* Indicador de conexión */}
          <ConnectionStatus />
          {/* Controles de idioma y tema */}
          <div className="flex items-center gap-2 rounded-lg bg-white/90 dark:bg-gray-800/90 p-1.5 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <LanguageSelector />
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <ThemeToggle />
          </div>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Header del formulario (solo visible en móvil) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:hidden text-center space-y-2"
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('login.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('login.subtitle')}
            </p>
          </motion.div>

          {/* Tarjeta del formulario con efecto vidrio moderno */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative space-y-6 p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl transition-all duration-500 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-primary-500/20 hover:scale-[1.01] hover:border-primary-500/30"
            style={{ zIndex: 10 }}
          >
            {/* Efecto de brillo activo al hover */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/10 via-transparent to-purple-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            {/* Borde brillante al activarse */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-xl" />

            {/* Título del formulario (solo desktop) */}
            <div className="hidden lg:block text-center space-y-2 pb-4">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {t('login.title')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {t('login.subtitle')}
              </motion.p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10" noValidate>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t('login.email')}
                </Label>
                <div className="group relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    autoComplete="email"
                    className={cn(
                      'transition-all duration-300 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 group-hover:border-primary-300 dark:group-hover:border-primary-600',
                      fieldErrors.email &&
                        touchedFields.has('email') &&
                        'border-red-500 focus:border-red-500 focus:ring-red-500/50',
                    )}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.email && touchedFields.has('email') && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t('login.password')}
                </Label>
                <div className="group relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    autoComplete="current-password"
                    className={cn(
                      'pr-10 transition-all duration-300 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 group-hover:border-primary-300 dark:group-hover:border-primary-600',
                      fieldErrors.password &&
                        touchedFields.has('password') &&
                        'border-red-500 focus:border-red-500 focus:ring-red-500/50',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition-all duration-300 hover:bg-gray-100 hover:text-primary-600 hover:scale-110 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {fieldErrors.password && touchedFields.has('password') && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-2.5"
              >
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 transition-all duration-300 hover:scale-110 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer text-sm text-gray-600 transition-colors duration-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {t('login.remember')}
                </label>
              </motion.div>

              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-lg dark:border-green-800 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <p className="font-medium">{t('login.success')}</p>
                    </div>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <p className="font-medium">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  type="submit"
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary-500/50 disabled:hover:scale-100"
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('login.submitting')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('login.submit')}
                      </>
                    )}
                  </span>
                  {/* Efecto de brillo en hover */}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
