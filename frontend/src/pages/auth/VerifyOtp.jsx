/*
 * VerifyOtp.jsx
 * Email verification page: shows six single-digit inputs for the 6-digit code
 * emailed at signup. On success it auto-logs the user in and redirects to the
 * dashboard. Also supports a "resend code" button with a countdown cooldown.
 * Access: public — reached right after signup (or login if unverified).
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Spinner } from '../../components/ui/Primitives';
import { authService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth(); // used to auto-login once the code checks out
  const email = location.state?.email || ''; // which account to verify, passed from Signup/Login
  const [digits, setDigits] = useState(['', '', '', '', '', '']); // one slot per OTP box
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds left before "Resend" is allowed again
  const inputs = useRef([]); // refs to each input box so we can move focus between them

  // Guard: if we arrived here without an email (e.g. page refresh), there's
  // nothing to verify — send the user back to signup.
  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  // Countdown timer for the resend cooldown: tick down by 1 every second and
  // clear the timeout on cleanup so timers don't stack up.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Typing in a box: keep only the last digit entered (ignore non-numbers),
  // store it, then auto-advance focus to the next box for fast entry.
  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1); // strip non-digits, keep a single character
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus(); // jump to the next box once filled
  };

  // Backspace on an already-empty box jumps focus back to the previous box,
  // so deleting feels natural across the six inputs.
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  // Pasting the whole code into any box: pull digits from the clipboard, spread
  // them across all six slots, and focus the box after the last pasted digit.
  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split(''); // first 6 digits only
    if (pasted.length) {
      const next = ['', '', '', '', '', ''];
      pasted.forEach((d, idx) => (next[idx] = d));
      setDigits(next);
      inputs.current[Math.min(pasted.length, 5)]?.focus(); // clamp to last index so focus stays in range
    }
  };

  // Verify the entered code; on success auto-login and go to the dashboard.
  const submit = async (e) => {
    e?.preventDefault(); // stop the form from reloading the page
    const otp = digits.join(''); // combine the six boxes into one string
    if (otp.length !== 6) return toast.error('Enter all 6 digits'); // basic guard before hitting the server
    setLoading(true);
    try {
      const res = await authService.verifyOtp({ email, otp });
      login(res.data.token, res.data.user); // auto-login: store the returned token + user
      toast.success(`Account verified! Welcome, ${res.data.user.firstName} 🎉`);
      navigate('/app/dashboard', { replace: true }); // straight into the app, can't go "back" to OTP
    } catch (err) {
      toast.error(err.message || 'Verification failed'); // wrong/expired code, etc.
    } finally {
      setLoading(false);
    }
  };

  // Request a fresh code, then start a 30-second cooldown so the user can't spam resend.
  const resend = async () => {
    try {
      await authService.resendOtp(email);
      toast.success('A new code has been sent to your email.');
      setCooldown(30); // disables the button and starts the countdown above
    } catch (err) {
      toast.error(err.message || 'Could not resend code');
    }
  };

  return (
    <AuthShell heading="Verify your email" sub={`We sent a 6-digit code to ${email}`}>
      <div className="mb-6 flex justify-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-16 w-16 place-items-center rounded-3xl bg-brand-gradient shadow-glow">
          <ShieldCheck className="h-8 w-8 text-white" />
        </motion.div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* onPaste is on the wrapper so a code pasted into any box fills all six */}
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {/* Render one input per digit; ref stores it so we can move focus programmatically */}
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              inputMode="numeric"
              maxLength={1}
              className="h-14 w-12 rounded-xl border border-slate-300 bg-white text-center text-2xl font-bold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white sm:h-16 sm:w-14"
            />
          ))}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : <>Verify account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Didn't get the code?{' '}
        {/* Disabled during the cooldown; label switches to a live countdown while waiting */}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/login" className="hover:underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
