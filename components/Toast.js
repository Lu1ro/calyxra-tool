// components/Toast.js
// Reusable toast notification — slides in from right, auto-dismisses after 4s
import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className="animate-slide-in"
            style={{
                position: 'fixed', top: 20, right: 20, zIndex: 999,
                padding: '12px 20px', borderRadius: 'var(--radius-lg)',
                background: type === 'error' ? 'var(--c-red)' : 'var(--c-green)',
                color: '#fff', fontSize: 'var(--text-md)', fontWeight: 500,
                boxShadow: 'var(--shadow-lg)', maxWidth: 400,
                fontFamily: 'var(--font-sans)',
            }}
        >
            {type === 'error' ? '❌ ' : '✅ '}{message}
        </div>
    );
}
