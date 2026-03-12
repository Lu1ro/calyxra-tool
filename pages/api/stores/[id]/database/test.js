import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';
import mysql from 'mysql2/promise';
import { BigQuery } from '@google-cloud/bigquery';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query; // store ID
    const { type, credentials, tableMappings } = req.body;

    // Ensure agency owns store
    const store = await prisma.store.findUnique({
        where: { id },
        select: { agencyId: true }
    });

    if (!store || store.agencyId !== session.user.agencyId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        let result = { success: false, message: 'Unknown database type', tables: [], rowCounts: {} };

        if (type === 'postgresql') {
            const client = new Client({
                host: credentials.host,
                port: credentials.port || 5432,
                database: credentials.database,
                user: credentials.username,
                password: credentials.password,
                ssl: credentials.sslMode === 'require' ? { rejectUnauthorized: false } : false
            });

            await client.connect();

            // Try to count rows for mapped tables
            const mappedValues = Object.values(tableMappings || {}).filter(v => v);
            result.tables = mappedValues;
            result.message = '✅ Connection successful! Connected to PostgreSQL.';

            for (const table of mappedValues) {
                try {
                    const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                    result.rowCounts[table] = parseInt(res.rows[0].count).toLocaleString();
                } catch (e) {
                    result.rowCounts[table] = 'Error/Not Found';
                }
            }

            await client.end();
            result.success = true;

        } else if (type === 'mysql') {
            const connection = await mysql.createConnection({
                host: credentials.host,
                port: credentials.port || 3306,
                database: credentials.database,
                user: credentials.username,
                password: credentials.password,
            });

            const mappedValues = Object.values(tableMappings || {}).filter(v => v);
            result.tables = mappedValues;
            result.message = '✅ Connection successful! Connected to MySQL.';

            for (const table of mappedValues) {
                try {
                    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                    result.rowCounts[table] = parseInt(rows[0].count).toLocaleString();
                } catch (e) {
                    result.rowCounts[table] = 'Error/Not Found';
                }
            }

            await connection.end();
            result.success = true;

        } else if (type === 'bigquery') {
            try {
                // To authenticate BigQuery from a JSON string provided by the user
                const credentialsJson = JSON.parse(credentials.serviceAccountKey);
                const bigquery = new BigQuery({
                    projectId: credentials.projectId,
                    credentials: credentialsJson
                });

                const dataset = bigquery.dataset(credentials.datasetId);
                const [exists] = await dataset.exists();

                if (!exists) {
                    throw new Error(`Dataset ${credentials.datasetId} not found.`);
                }

                const mappedValues = Object.values(tableMappings || {}).filter(v => v);
                result.tables = mappedValues;
                result.message = '✅ Connection successful! Connected to BigQuery.';

                for (const table of mappedValues) {
                    try {
                        const query = `SELECT COUNT(*) as count FROM \`${credentials.projectId}.${credentials.datasetId}.${table}\``;
                        const [job] = await bigquery.createQueryJob({ query });
                        const [rows] = await job.getQueryResults();
                        result.rowCounts[table] = parseInt(rows[0].count).toLocaleString();
                    } catch (e) {
                        result.rowCounts[table] = 'Error/Not Found';
                    }
                }

                result.success = true;
            } catch (bqError) {
                result.message = `❌ BigQuery Connection failed: ${bqError.message}`;
            }
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error('Database connection test failed:', error);
        return res.status(200).json({
            success: false,
            message: `❌ Connection failed: ${error.message || 'Check your credentials.'}`,
            tables: [],
            rowCounts: {}
        });
    }
}
