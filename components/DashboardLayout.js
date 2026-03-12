// components/DashboardLayout.js
// Shared layout wrapper for all dashboard pages
// Provides consistent page structure, head tags, and font imports
import Head from 'next/head';

export default function DashboardLayout({ title, children }) {
    return (
        <>
            <Head>
                <title>{title || 'Calyxra Dashboard'}</title>
                <meta name="description" content="Calyxra — Revenue reconciliation and ad budget optimization for e-commerce" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="page-bg">
                {children}
            </div>
        </>
    );
}
