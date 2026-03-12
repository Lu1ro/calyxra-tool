// pages/login.js
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <DashboardLayout title="Login — Calyxra">
            <div className="flex-center" style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, var(--c-green-bg) 0%, var(--c-blue-light) 100%)',
            }}>
                <div className="card animate-slide-up" style={{ padding: 'var(--space-10)', width: 400, boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                        <img src="/logo.png" alt="Calyxra" style={{ height: 48, marginBottom: 12 }} />
                        <h1 className="heading-serif" style={{ fontSize: 'var(--text-2xl)', margin: 0 }}>Welcome Back</h1>
                        <p className="text-muted text-md" style={{ marginTop: 4 }}>Sign in to your agency dashboard</p>
                    </div>

                    {error && <div className="alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="text-base font-semibold" style={{ display: 'block', color: 'var(--c-gray-700)', marginBottom: 6 }}>Email</label>
                            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@agency.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <label className="text-base font-semibold" style={{ display: 'block', color: 'var(--c-gray-700)', marginBottom: 6 }}>Password</label>
                            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px 0', fontSize: 'var(--text-md)' }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-muted text-md" style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
                        Don't have an account?{' '}
                        <a href="/register" style={{ color: 'var(--c-green)', fontWeight: 600, textDecoration: 'none' }}>Create one</a>
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
