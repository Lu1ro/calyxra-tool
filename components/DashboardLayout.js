// components/DashboardLayout.js
// Shared layout wrapper for all dashboard pages
// Provides consistent page structure, head tags, and font imports
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ title, children }) {
    const { data: session } = useSession();
    const [tier, setTier] = useState(null);

    useEffect(() => {
        if (session) {
            fetch('/api/agency')
                .then(r => r.json())
                .then(data => setTier(data.tier || 'free'))
                .catch(() => setTier('free'));
        }
    }, [session]);

    return (
        <>
            <Head>
                <title>{title || 'Calyxra Dashboard'}</title>
                <meta name="description" content="Calyxra — Revenue reconciliation and ad budget optimization for e-commerce" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="page-bg">
                {tier === 'free' && (
                    <div style={{
                        background: '#fff8e1', borderBottom: '1px solid #ffa940',
                        padding: '10px 24px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', fontSize: '14px',
                    }}>
                        <span>⚡️ You&apos;re on the Free Plan — 1 store included, results locked</span>
                        <a href="https://calyxra.com/#pricing" style={{
                            background: '#00b894', color: 'white', padding: '6px 16px',
                            borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '13px',
                        }}>Upgrade — $150/mo</a>
                    </div>
                )}
                {children}
            </div>
        </>
    );
}
