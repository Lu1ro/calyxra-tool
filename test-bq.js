import { PrismaClient } from '@prisma/client';
import { BigQuery } from '@google-cloud/bigquery';

const prisma = new PrismaClient();

async function test() {
    const store = await prisma.store.findFirst();
    if (!store) return console.log("No store found");
    const config = JSON.parse(store.databaseConfig);
    const creds = JSON.parse(config.credentials.serviceAccountKey);
    const bigquery = new BigQuery({
        projectId: config.credentials.projectId,
        credentials: creds
    });

    try {
        const query = `
            SELECT 
                COALESCE(NULLIF(\`Discount Code\`, ''), 'Organic/Direct') as campaignName,
                SUM(CAST(Total as FLOAT64)) as trueRevenue,
                SUM(CAST(Total as FLOAT64) * 0.45) as totalCogs
            FROM \`${config.credentials.projectId}.${config.credentials.datasetId}.shopify_orders\`
            WHERE \`Financial Status\` IN ('paid', 'partially_refunded')
            GROUP BY campaignName
        `;
        const [job] = await bigquery.createQueryJob({ query });
        const [rows] = await job.getQueryResults();
        if (rows.length > 0) {
            console.log("COLUMNS:", Object.keys(rows[0]));
        } else {
            console.log("TABLE IS EMPTY");
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test();
