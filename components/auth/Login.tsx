import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import Spinner from '../common/Spinner';

const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAuthResponse = (error: any) => {
    if (error) {
        setError(error.message);
        console.error('Authentication error:', error.message || error);
    } else {
        setError(null);
        // Successful sign-in/up is handled by onAuthStateChange in App.tsx
    }
    setIsLoading(false);
  };


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
        handleAuthResponse(error);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);

    if (isLoginView) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      handleAuthResponse(error);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      handleAuthResponse(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="max-w-md w-full bg-card-bg p-8 rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-2">
            {isLoginView ? 'Welcome Back!' : 'Create Account'}
          </h1>
          <p className="text-text-secondary">
            {isLoginView
              ? 'Sign in to continue to AI Image Stylizer.'
              : 'Get started with your new account.'}
          </p>
        </div>

        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-left text-text"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-border-color rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-left text-text"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-background border border-border-color rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:bg-indigo-400/50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Spinner className="h-5 w-5" />
              ) : isLoginView ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-color" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card-bg text-text-secondary">
                Or continue with
              </span>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-3 px-4 border border-border-color rounded-md shadow-sm bg-background text-sm font-medium text-text hover:bg-border-color disabled:bg-border-color/50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5 mr-3"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z" />
              </svg>
              Google
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {isLoginView
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError(null);
              setEmail('');
              setPassword('');
            }}
            className="font-medium text-primary hover:text-indigo-400"
          >
            {isLoginView ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
