import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { TbFidgetSpinner } from 'react-icons/tb';
import useAuth from '../../hooks/useAuth';
import { useState } from 'react';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state || '/';

    const { createUser, signInWithGoogle, signIn, loading, setLoading, resetPassword } = useAuth();
    const [email, setEmail] = useState('');

    // 1. handle form submit
    const handleSubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const password = form.password.value;

        try {
            setLoading(true);
            // 1. Sign in user
            await signIn(email, password);
            navigate(from, { replace: true });

            toast.success('Login successful 🎉');
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    //2. handle reset password
    const handleResetPassword = async () => {
        if (!email) return toast.error('Please provide your email address to reset password');

        try {
            setLoading(true);
            await resetPassword(email);
            toast.success('Please check your email inbox to reset your password');
        } catch (err) {
            console.log(err.message);
            toast.error(err?.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    // 3. handle google sign in
    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            navigate(from, { replace: true });
            toast.success('Google Sign-In successful 🎉');
        } catch (error) {
            console.error('Google Sign-In error:', error);
            toast.error(error?.message || 'Google Sign-In failed');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="flex flex-col max-w-md p-6 rounded-md sm:p-10 bg-gray-100 text-gray-900">
                <div className="mb-8 text-center">
                    <h1 className="my-3 text-4xl font-bold">Log In</h1>
                    <p className="text-sm text-gray-400">Sign in to access your account</p>
                </div>
                <form onSubmit={handleSubmit} noValidate="" action="" className="space-y-6 ng-untouched ng-pristine ng-valid">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block mb-2 text-sm">
                                Email address
                            </label>
                            <input
                                type="email"
                                name="email"
                                //   onChange={e => setEmail (e.target.value)}
                                onBlur={e => setEmail(e.target.value)}
                                id="email"
                                required
                                placeholder="Enter Your Email Here"
                                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-rose-500 bg-gray-200 text-gray-900"
                                data-temp-mail-org="0"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between">
                                <label htmlFor="password" className="text-sm mb-2">
                                    Password
                                </label>
                            </div>
                            <input
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                id="password"
                                required
                                placeholder="*******"
                                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-rose-500 bg-gray-200 text-gray-900"
                            />
                        </div>
                    </div>

                    <div>
                        <button disabled={loading} type="submit" className="bg-rose-500 w-full rounded-md py-3 text-white">
                            {loading ? <TbFidgetSpinner className="animate-spin m-auto text-xl" /> : 'Sign in'}
                        </button>
                    </div>
                </form>
                <div className="space-y-1">
                    <button onClick={handleResetPassword} className="text-xs hover:underline hover:text-rose-500 text-gray-400">
                        Forgot password?
                    </button>
                </div>
                <div className="flex items-center pt-4 space-x-1">
                    <div className="flex-1 h-px sm:w-16 dark:bg-gray-700"></div>
                    <p className="px-3 text-sm dark:text-gray-400">Login with social accounts</p>
                    <div className="flex-1 h-px sm:w-16 dark:bg-gray-700"></div>
                </div>
                <button
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className="disabled:cursor-not-allowed cursor-pointer flex justify-center items-center space-x-2 border m-3 p-2 border-gray-300 border-rounded">
                    <FcGoogle size={32} />

                    <p>Continue with Google</p>
                </button>
                <p className="px-6 text-sm text-center text-gray-400">
                    Don&apos;t have an account yet?{' '}
                    <Link to="/signup" className="hover:underline hover:text-rose-500 text-gray-600">
                        Sign up
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
};

export default Login;
