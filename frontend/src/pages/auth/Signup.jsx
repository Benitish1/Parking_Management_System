/*
 * Signup.jsx
 * Registration page: collects name, email, password and a role, creates the
 * account, then sends the user to the OTP screen to verify their email.
 * Access: public — for new visitors creating an account.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Spinner } from '../../components/ui/Primitives';
import { authService } from '../../services';

// The two roles a user can pick at signup, kept as data so we can map them
// into selectable cards below (icon/label/description for each).
const roles = [
  { value: 'attendant', label: 'Parking Attendant', desc: 'View parkings, spaces & fees', icon: Car },
  { value: 'admin', label: 'Administrator', desc: 'Full management & reports', icon: Shield },
];

export default function Signup() {
  // watch lets us read the live "role" value to highlight the chosen card;
  // setValue lets the custom card buttons update that hidden role field.
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { role: 'attendant' }, // default selection so a role is always set
  });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false); // show/hide password text
  const navigate = useNavigate();
  const selectedRole = watch('role'); // current role value, used to style the active card

  // Called after validation passes; creates the account then routes to OTP.
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await authService.signup(values); // register the new account
      toast.success('Account created! Check your email for the 6-digit code.');
      // Account isn't usable until verified, so go straight to the OTP page,
      // passing the email along so it knows which account to verify.
      navigate('/verify-otp', { state: { email: values.email } });
    } catch (err) {
      // Backend can return several field errors at once — show a toast for each;
      // otherwise fall back to a single generic message.
      if (err.errors?.length) err.errors.forEach((e) => toast.error(e.message));
      else toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell heading="Create your account" sub="Join XWZ Parking in a few seconds">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-11" placeholder="Alice" {...register('firstName', { required: 'Required' })} />
            </div>
            {errors.firstName && <p className="mt-1 text-xs text-rose-500">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" placeholder="Mukamana" {...register('lastName', { required: 'Required' })} />
            {errors.lastName && <p className="mt-1 text-xs text-rose-500">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {/* required + a regex pattern check the email is present and shaped like an address before submitting */}
            <input type="email" className="input pl-11" placeholder="you@xwz.rw"
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {/* Password rules enforced client-side: at least 8 chars, plus the custom
                validate functions require an uppercase, a lowercase and a number.
                Each returns true to pass, or the message string to show on failure. */}
            <input type={show ? 'text' : 'password'} className="input px-11" placeholder="Min 8 chars, A-z, 0-9"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                validate: {
                  upper: (v) => /[A-Z]/.test(v) || 'Needs an uppercase letter',
                  lower: (v) => /[a-z]/.test(v) || 'Needs a lowercase letter',
                  number: (v) => /[0-9]/.test(v) || 'Needs a number',
                },
              })} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Select your role</label>
          {/* Custom role picker: these are styled buttons, not radio inputs, so each one
              writes its value into the hidden "role" field via setValue when clicked */}
          <div className="grid grid-cols-2 gap-3">
            {roles.map((r) => {
              const active = selectedRole === r.value; // is this the currently selected role?
              return (
                <motion.button
                  type="button"
                  key={r.value}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setValue('role', r.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-brand-500 bg-brand-500/10 shadow-glow'
                      : 'border-slate-300 hover:border-brand-400 dark:border-white/10'
                  }`}
                >
                  <r.icon className={`h-5 w-5 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.label}</span>
                  <span className="text-[11px] text-slate-500">{r.desc}</span>
                </motion.button>
              );
            })}
          </div>
          {/* Hidden field that actually holds the role value submitted with the form */}
          <input type="hidden" {...register('role')} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
