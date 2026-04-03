// pages/api/auth/register.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/db';

// Simple in-memory rate limiter for registration
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5; // max 5 registrations per IP per window

function isRateLimited(ip) {
    const now = Date.now();
    const record = attempts.get(ip);
    if (!record || now - record.firstAttempt > WINDOW_MS) {
        attempts.set(ip, { count: 1, firstAttempt: now });
        return false;
    }
    record.count++;
    return record.count > MAX_ATTEMPTS;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit by IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
        return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        // Check if agency already exists
        const existing = await prisma.agency.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Hash password and create agency
        const hashedPassword = await bcrypt.hash(password, 12);
        const agency = await prisma.agency.create({
            data: {
                name,
                email,
                password: hashedPassword,
                tier: 'free', // free tier — 1 store, blurred results, upgrade CTA
            },
        });

        return res.status(201).json({
            success: true,
            agency: { id: agency.id, name: agency.name, email: agency.email, tier: agency.tier },
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Failed to create account' });
    }
}
