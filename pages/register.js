// pages/register.js — Registration page
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (form.password !== form.confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed');
                setLoading(false);
                return;
            }

            // Auto sign in after registration
            const result = await signIn('credentials', {
                email: form.email.trim().toLowerCase(),
                password: form.password,
                redirect: false,
            });

            if (result?.error) {
                // Account created but auto-login failed — redirect to login
                router.push('/login');
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Create Account — Calyxra</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style jsx global>{`
                .register-page {
                    display: flex;
                    min-height: 100vh;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                .register-hero {
                    flex: 1;
                    background: linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a2e35 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 64px;
                    position: relative;
                    overflow: hidden;
                }

                .register-hero::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -30%;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(0,184,148,0.12) 0%, transparent 70%);
                    border-radius: 50%;
                }

                .register-hero-content {
                    position: relative;
                    z-index: 1;
                    max-width: 480px;
                }

                .register-hero-content .hero-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 48px;
                }

                .register-hero-content .hero-logo img { height: 40px; }
                .register-hero-content .hero-logo span { font-size: 22px; font-weight: 700; color: #e8e8f0; }
                .register-hero-content .hero-logo .accent { color: #00b894; }

                .register-hero-content h1 {
                    font-family: 'DM Serif Display', serif;
                    font-size: 32px;
                    color: #fff;
                    line-height: 1.3;
                    margin: 0 0 20px;
                }

                .register-hero-content p {
                    color: rgba(255,255,255,0.5);
                    font-size: 15px;
                    line-height: 1.6;
                    margin: 0 0 40px;
                }

                .feature-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .feature-list li {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    color: rgba(255,255,255,0.6);
                    font-size: 14px;
                    line-height: 1.5;
                }

                .feature-check {
                    flex-shrink: 0;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: rgba(0,184,148,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 1px;
                }

                .register-form-side {
                    width: 520px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    padding: 40px;
                }

                .register-form-inner {
                    width: 100%;
                    max-width: 380px;
                }

                .register-form-inner h2 {
                    font-family: 'DM Serif Display', serif;
                    font-size: 26px;
                    color: #1a1a2e;
                    margin: 0 0 4px;
                }

                .register-form-inner > p {
                    color: #636e72;
                    font-size: 14px;
                    margin: 0 0 28px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                @media (max-width: 900px) {
                    .register-hero { display: none; }
                    .register-form-side { width: 100%; }
                    .form-row { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="register-page">
                <div className="register-hero">
                    <div className="register-hero-content">
                        <div className="hero-logo">
                            <img src="/logo.png" alt="Calyxra" />
                            <span>Calyx<span className="accent">ra</span></span>
                        </div>
                        <h1>Start finding phantom revenue today</h1>
                        <p>Create your free account and connect your first Shopify store in under 2 minutes.</p>
                        <ul className="feature-list">
                            <li>
                                <span className="feature-check">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                                Free tier — 1 store, full reconciliation
                            </li>
                            <li>
                                <span className="feature-check">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                                Read-only API access — your data stays safe
                            </li>
                            <li>
                                <span className="feature-check">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                                White-label PDF reports under your brand
                            </li>
                            <li>
                                <span className="feature-check">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                </span>
                                No credit card required
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="register-form-side">
                    <div className="register-form-inner">
                        <h2>Create your account</h2>
                        <p>Start reconciling revenue in minutes</p>

                        {error && <div style={{
                            background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8,
                            padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13,
                        }}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Agency Name</label>
                                <input
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #dfe6e9', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', background: '#fafbfc', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                                    value={form.name}
                                    onChange={e => set('name', e.target.value)}
                                    required
                                    placeholder="Your Agency"
                                    onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 3px rgba(0,184,148,0.12)'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Email</label>
                                <input
                                    type="email"
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #dfe6e9', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', background: '#fafbfc', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                                    value={form.email}
                                    onChange={e => set('email', e.target.value)}
                                    required
                                    placeholder="you@agency.com"
                                    onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 3px rgba(0,184,148,0.12)'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                                />
                            </div>
                            <div className="form-row" style={{ marginBottom: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Password</label>
                                    <input
                                        type="password"
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #dfe6e9', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', background: '#fafbfc', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                                        value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        required
                                        placeholder="Min 8 chars"
                                        onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 3px rgba(0,184,148,0.12)'; e.target.style.background = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 6 }}>Confirm</label>
                                    <input
                                        type="password"
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1px solid #dfe6e9', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', background: '#fafbfc', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                                        value={form.confirm}
                                        onChange={e => set('confirm', e.target.value)}
                                        required
                                        placeholder="Repeat"
                                        onFocus={e => { e.target.style.borderColor = '#00b894'; e.target.style.boxShadow = '0 0 0 3px rgba(0,184,148,0.12)'; e.target.style.background = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#dfe6e9'; e.target.style.boxShadow = 'none'; e.target.style.background = '#fafbfc'; }}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={{
                                width: '100%', padding: '12px 0', background: '#00b894', color: '#fff',
                                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                                fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { if (!loading) { e.target.style.background = '#007a65'; e.target.style.boxShadow = '0 4px 14px rgba(0,184,148,0.3)'; } }}
                            onMouseLeave={e => { e.target.style.background = '#00b894'; e.target.style.boxShadow = 'none'; }}
                            >
                                {loading ? 'Creating account...' : 'Create Free Account →'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 20, color: '#636e72', fontSize: 14 }}>
                            Already have an account?{' '}
                            <a href="/login" style={{ color: '#00b894', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
                        </p>

                        <p style={{ textAlign: 'center', marginTop: 12, color: '#b2bec3', fontSize: 11 }}>
                            By creating an account you agree to our Terms of Service
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
