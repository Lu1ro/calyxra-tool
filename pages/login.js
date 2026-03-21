// pages/login.js
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

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

    const inputStyle = {
        width: '100%', boxSizing: 'border-box', padding: '12px 14px',
        border: '1px solid #dfe6e9', borderRadius: 8, fontSize: 14,
        fontFamily: "'Inter', sans-serif", outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    return (
        <>
            <Head>
                <title>Login — Calyxra</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f8f9fa', fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    maxWidth: 420, width: '100%', margin: '0 20px',
                    background: '#fff', borderRadius: 12, padding: '48px 40px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <img src="/logo.png" alt="Calyxra" style={{ height: 48, marginBottom: 12 }} />
                        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, margin: 0, color: '#2d3436' }}>Welcome Back</h1>
                        <p style={{ color: '#636e72', fontSize: 14, marginTop: 4 }}>Sign in to your agency dashboard</p>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13,
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Email</label>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                required placeholder="you@agency.com" style={inputStyle}
                                onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 2px rgba(0,184,148,0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Password</label>
                            <input
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                required placeholder="••••••••" style={inputStyle}
                                onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 2px rgba(0,184,148,0.2)'; }}
                                onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '12px 0', background: '#00b894', color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                            fontFamily: "'Inter', sans-serif", transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => { if (!loading) e.target.style.background = '#007a65'; }}
                        onMouseLeave={e => { e.target.style.background = '#00b894'; }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 20, color: '#636e72', fontSize: 14 }}>
                        Don&apos;t have an account?{' '}
                        <a href="https://cal.com/calyxra/15min" target="_blank" rel="noopener noreferrer" style={{ color: '#00b894', fontWeight: 600, textDecoration: 'none' }}>Book a call</a>
                        {' '}to get access.
                    </p>
                </div>
            </div>
        </>
    );
}
