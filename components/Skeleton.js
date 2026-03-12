// components/Skeleton.js
// Animated loading skeleton — uses shimmer animation from design system

export default function Skeleton({ height = 200, width = '100%', borderRadius }) {
    return (
        <div
            className="skeleton"
            style={{
                height,
                width,
                borderRadius: borderRadius || 'var(--radius-xl)',
            }}
        />
    );
}
