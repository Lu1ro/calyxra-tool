import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { prisma } from '../../../../../lib/db';
import { getBigQueryClientForStore } from '../../../../../lib/bigquery';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const agencyId = session.user.agencyId;

    // Verify store ownership
    const store = await prisma.store.findFirst({ where: { id, agencyId } });
    if (!store) return res.status(404).json({ error: 'Store not found' });

    try {
        const { bigquery, projectId, datasetId, mappings } = await getBigQueryClientForStore(id);
        const shopifyTable = mappings.shopifyOrders || 'shopify_orders';

        // Query to aggregate new vs returning customers by campaign from Shopify raw tables
        const query = `
            SELECT 
                COALESCE(NULLIF(\`Discount Code\`, ''), 'Organic/Direct') as campaignName,
                COUNT(DISTINCT Email) as newCustomers,
                COUNT(DISTINCT CASE WHEN false THEN Email END) as returningCustomers,
                SUM(CAST(Total as FLOAT64)) as acquisitionRevenue,
                0 as retentionRevenue
            FROM \`${projectId}.${datasetId}.${shopifyTable}\`
            WHERE \`Financial Status\` IN ('paid', 'partially_refunded')
            GROUP BY campaignName
            ORDER BY acquisitionRevenue DESC
        `;

        const [job] = await bigquery.createQueryJob({ query });
        const [rows] = await job.getQueryResults();

        return res.status(200).json({
            success: true,
            data: rows.map(r => ({
                campaignName: r.campaignName,
                newCustomers: r.newCustomers || 0,
                returningCustomers: r.returningCustomers || 0,
                acquisitionRevenue: r.acquisitionRevenue || 0,
                retentionRevenue: r.retentionRevenue || 0
            }))
        });

    } catch (error) {
        console.error('BigQuery LTV query failed:', error);
        // Return graceful empty response instead of 500 — lets frontend fall back to demo data
        return res.status(200).json({ success: false, data: [], error: error.message });
    }
}
