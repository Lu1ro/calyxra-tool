// pages/login.js — Premium split-screen login
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

    return (
        <>
            <Head>
                <title>Login — Calyxra</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style jsx global>{`
                .login-page {
                    display: flex;
                    min-height: 100vh;
                    font-family: 'Inter', -apple-system, sans-serif;
                }

                .login-hero {
                    flex: 1;
                    background: linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a2e35 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 64px;
                    position: relative;
                    overflow: hidden;
                }

                .login-hero::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -30%;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(0,184,148,0.12) 0%, transparent 70%);
                    border-radius: 50%;
                }

                .login-hero::after {
                    content: '';
                    position: absolute;
                    bottom: -30%;
                    left: -20%;
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, rgba(0,184,148,0.08) 0%, transparent 70%);
                    border-radius: 50%;
                }

                .hero-content {
                    position: relative;
                    z-index: 1;
                    max-width: 480px;
                }

                .hero-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 48px;
                }

                .hero-logo img {
                    height: 40px;
                }

                .hero-logo span {
                    font-size: 22px;
                    font-weight: 700;
                    color: #e8e8f0;
                    letter-spacing: -0.3px;
                }

                .hero-logo .accent {
                    color: #064E3B;
                }

                .hero-title {
                    font-family: 'DM Serif Display', serif;
                    font-size: 36px;
                    color: #ffffff;
                    line-height: 1.25;
                    margin: 0 0 16px;
                }

                .hero-subtitle {
                    font-size: 16px;
                    color: rgba(255,255,255,0.55);
                    line-height: 1.6;
                    margin: 0 0 48px;
                }

                .hero-stats {
                    display: flex;
                    gap: 40px;
                }

                .hero-stat {
                    display: flex;
                    flex-direction: column;
                }

                .hero-stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #064E3B;
                    letter-spacing: -0.5px;
                }

                .hero-stat-label {
                    font-size: 12px;
                    color: rgba(255,255,255,0.35);
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    margin-top: 4px;
                }

                .hero-quote {
                    margin-top: 48px;
                    padding: 20px 24px;
                    background: rgba(255,255,255,0.04);
                    border-left: 3px solid #064E3B;
                    border-radius: 0 8px 8px 0;
                }

                .hero-quote p {
                    color: rgba(255,255,255,0.6);
                    font-size: 14px;
                    font-style: italic;
                    line-height: 1.6;
                    margin: 0 0 8px;
                }

                .hero-quote cite {
                    color: rgba(255,255,255,0.35);
                    font-size: 12px;
                    font-style: normal;
                }

                /* ─── Form Side ──────────── */
                .login-form-side {
                    width: 480px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    padding: 40px;
                }

                .login-form-inner {
                    width: 100%;
                    max-width: 360px;
                }

                .login-welcome {
                    margin-bottom: 32px;
                }

                .login-welcome h2 {
                    font-family: 'DM Serif Display', serif;
                    font-size: 26px;
                    color: #1a1a2e;
                    margin: 0 0 6px;
                }

                .login-welcome p {
                    color: #78716C;
                    font-size: 14px;
                    margin: 0;
                }

                .login-error {
                    background: #fff5f5;
                    border: 1px solid #feb2b2;
                    border-radius: 8px;
                    padding: 10px 14px;
                    margin-bottom: 16px;
                    color: #dc2626;
                    font-size: 13px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #1C1917;
                    margin-bottom: 6px;
                }

                .form-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 11px 14px;
                    border: 1px solid #dfe6e9;
                    border-radius: 8px;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    color: #1C1917;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    background: #fafbfc;
                }

                .form-input:focus {
                    border-color: #064E3B;
                    box-shadow: 0 0 0 3px rgba(0,184,148,0.12);
                    background: #fff;
                }

                .form-input::placeholder {
                    color: #b2bec3;
                }

                .login-btn {
                    width: 100%;
                    padding: 12px 0;
                    background: #064E3B;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .login-btn:hover:not(:disabled) {
                    background: #043927;
                    box-shadow: 0 4px 14px rgba(0,184,148,0.3);
                    transform: translateY(-1px);
                }

                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                .login-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .login-footer {
                    text-align: center;
                    margin-top: 24px;
                    color: #78716C;
                    font-size: 14px;
                }

                .login-footer a {
                    color: #064E3B;
                    font-weight: 600;
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .login-footer a:hover {
                    color: #043927;
                }

                .login-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 20px 0;
                    color: #b2bec3;
                    font-size: 12px;
                }

                .login-divider::before,
                .login-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #dfe6e9;
                }

                .security-note {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    justify-content: center;
                    margin-top: 16px;
                    color: #b2bec3;
                    font-size: 11px;
                }

                /* ─── Mobile ──────────── */
                @media (max-width: 900px) {
                    .login-hero {
                        display: none;
                    }
                    .login-form-side {
                        width: 100%;
                    }
                }

                @media (max-width: 480px) {
                    .login-form-side {
                        padding: 24px 20px;
                    }
                }
            `}</style>

            <div className="login-page">
                {/* Left — Hero */}
                <div className="login-hero">
                    <div className="hero-content">
                        <div className="hero-logo">
                            <img src="/logo.png" alt="Calyxra" />
                            <span>Calyx<span className="accent">ra</span></span>
                        </div>

                        <h1 className="hero-title">
                            Stop losing money to phantom revenue
                        </h1>
                        <p className="hero-subtitle">
                            Ad platforms overstate your revenue by 15–40%.
                            Calyxra shows you the real numbers so you can make
                            better decisions for your clients.
                        </p>

                        <div className="hero-stats">
                            <div className="hero-stat">
                                <span className="hero-stat-value">$2.4M+</span>
                                <span className="hero-stat-label">Phantom Revenue Found</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-value">15–40%</span>
                                <span className="hero-stat-label">Avg Revenue Gap</span>
                            </div>
                            <div className="hero-stat">
                                <span className="hero-stat-value">&lt;30s</span>
                                <span className="hero-stat-label">Time to Results</span>
                            </div>
                        </div>

                        <div className="hero-quote">
                            <p>&ldquo;We found $82K in phantom revenue across 3 client stores in the first week.&rdquo;</p>
                            <cite>— Shopify Plus Agency, UK</cite>
                        </div>
                    </div>
                </div>

                {/* Right — Form */}
                <div className="login-form-side">
                    <div className="login-form-inner">
                        <div className="login-welcome">
                            <h2>Welcome back</h2>
                            <p>Sign in to your agency dashboard</p>
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@agency.com"
                                    autoComplete="email"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="login-btn">
                                {loading ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                        </svg>
                                        Signing in...
                                    </>
                                ) : 'Sign In →'}
                            </button>
                        </form>

                        <div className="login-divider">or</div>

                        <p className="login-footer">
                            Don&apos;t have an account?{' '}
                            <a href="/register">Create one</a>
                            {' '}or{' '}
                            <a href="https://cal.com/calyxra/15min" target="_blank" rel="noopener noreferrer">
                                book a demo
                            </a>
                        </p>

                        <div className="security-note">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            256-bit encryption · Read-only API access · SOC 2 ready
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
