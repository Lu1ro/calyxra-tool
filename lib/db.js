// lib/db.js
// Prisma client singleton — prevents multiple instances in dev

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // In dev, reuse the same instance to avoid "too many connections"
    if (!global.__prisma) {
        global.__prisma = new PrismaClient();
    }
    prisma = global.__prisma;
}

module.exports = { prisma };
