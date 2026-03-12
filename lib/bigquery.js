import { BigQuery } from '@google-cloud/bigquery';
import { prisma } from './db.js';

/**
 * Gets the BigQuery client and dataset ID for a specific store.
 * @param {string} storeId
 * @returns {Promise<{ bigquery: BigQuery, datasetId: string, projectId: string }>}
 */
export async function getBigQueryClientForStore(storeId) {
    const store = await prisma.store.findUnique({
        where: { id: storeId }
    });

    if (!store || !store.databaseConfig) {
        throw new Error('Store database configuration not found.');
    }

    let config;
    try {
        config = JSON.parse(store.databaseConfig);
    } catch (e) {
        throw new Error('Invalid database configuration format.');
    }

    if (config.type !== 'bigquery') {
        throw new Error(`Unsupported database type: ${config.type}. Only BigQuery is currently supported for direct advanced analytics querying.`);
    }

    const credentials = config.credentials;
    if (!credentials || !credentials.serviceAccountKey || !credentials.projectId || !credentials.datasetId) {
        throw new Error('Incomplete BigQuery credentials found.');
    }

    let keyFileJson;
    try {
        keyFileJson = JSON.parse(credentials.serviceAccountKey);
    } catch (e) {
        throw new Error('Invalid Service Account Key JSON format.');
    }

    const bigquery = new BigQuery({
        projectId: credentials.projectId,
        credentials: keyFileJson
    });

    return {
        bigquery,
        datasetId: credentials.datasetId,
        projectId: credentials.projectId,
        mappings: config.mappings || {}
    };
}
