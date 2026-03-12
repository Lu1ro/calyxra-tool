// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/db';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                const agency = await prisma.agency.findUnique({
                    where: { email: credentials.email },
                });

                if (!agency) {
                    throw new Error('No account found with this email');
                }

                const isValid = await bcrypt.compare(credentials.password, agency.password);
                if (!isValid) {
                    throw new Error('Invalid password');
                }

                return {
                    id: agency.id,
                    email: agency.email,
                    name: agency.name,
                    tier: agency.tier,
                };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.agencyId = user.id;
                token.tier = user.tier;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.agencyId = token.agencyId;
                session.user.tier = token.tier;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
