// pages/register.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const GREEN = '#166534';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed');
                setLoading(false);
                return;
            }

            // Auto-redirect to login after successful registration
            router.push('/login?registered=true');
        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Create Account — Calyxra</title>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
                fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 40,
                    width: 400,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <img src="/logo.png" alt="Calyxra" style={{ height: 48, marginBottom: 12 }} />
                        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#111827', margin: 0 }}>
                            Create Your Account
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Start your Founding Partner trial</p>
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Agency Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                placeholder="Your Agency"
                            />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                placeholder="you@agency.com"
                            />
                            <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>We'll use this for your login</span>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                                placeholder="Min. 8 characters"
                            />
                            <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
                                <span>Minimum 8 characters</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '12px 0',
                                background: GREEN,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6b7280' }}>
                        Already have an account?{' '}
                        <a href="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
                    </p>
                </div>
            </div>
        </>
    );
}
