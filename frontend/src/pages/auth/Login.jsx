/*
 * Login.jsx
 * Sign-in page: collects email + password, calls the auth service, and on
 * success stores the token/user in AuthContext and redirects into the app.
 * Access: public — for visitors who are not logged in.
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Spinner } from '../../components/ui/Primitives';
import { authService } from '../../services';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  // react-hook-form: register wires inputs to the form, handleSubmit validates
  // before calling onSubmit, and errors holds any validation messages to show.
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false); // disables the button + shows a spinner while the request is in flight
  const [show, setShow] = useState(false); // toggles password visibility (text vs password input)
  const { login } = useAuth(); // saves token + user into global auth state
  const navigate = useNavigate();
  const location = useLocation(); // used to read where the user was trying to go before being sent to login

  // Runs only after react-hook-form confirms the fields are valid.
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await authService.login(values); // send credentials to the backend via the gateway
      login(res.data.token, res.data.user); // persist auth so the rest of the app knows we're signed in
      toast.success(`Welcome back, ${res.data.user.firstName}!`); // friendly confirmation toast
      // Send the user back to the page they originally requested (saved in location.state),
      // or to the dashboard by default. replace: true so "back" doesn't return to /login.
      const dest = location.state?.from?.pathname || '/app/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      // Special case: account exists but email isn't verified yet — route to OTP screen.
      if (err.errors?.needsVerification) {
        toast.error('Please verify your account first.');
        navigate('/verify-otp', { state: { email: values.email } }); // pass the email so the OTP page knows who to verify
      } else {
        toast.error(err.message || 'Login failed'); // generic failure (wrong password, server error, etc.)
      }
    } finally {
      setLoading(false); // always re-enable the form, whether it succeeded or failed
    }
  };

  return (
    <AuthShell heading="Welcome back" sub="Sign in to your XWZ Parking account">
      {/* handleSubmit runs validation first, then calls our onSubmit if the form is valid */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              className="input pl-11"
              placeholder="you@xwz.rw"
              {...register('email', { required: 'Email is required' })}
            />
          </div>
          {/* Show the validation message only when this field has an error */}
          {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={show ? 'text' : 'password'}
              className="input px-11"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
            />
            {/* type="button" so clicking the eye toggles visibility instead of submitting the form */}
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
        </div>

        {/* Disabled while submitting; swaps the label for a spinner so the user knows it's working */}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      

      <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
