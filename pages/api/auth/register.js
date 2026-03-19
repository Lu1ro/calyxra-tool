// pages/api/auth/register.js
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Only allow internal calls (Stripe webhook) with secret
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(403).json({ error: 'Registration is not available. Accounts are created after payment.' });
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
                tier: 'pilot', // default tier
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
