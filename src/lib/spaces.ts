import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const spacesClient = new S3Client({
    region: 'us-east-1', // DigitalOcean Spaces uses this as default region
    endpoint: process.env.DO_SPACES_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY || '',
        secretAccessKey: process.env.DO_SPACES_SECRET || '',
    },
});

export async function uploadToSpaces(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
): Promise<string> {
    const key = `uploads/${userId}/${Date.now()}-${fileName}`;
    const bucket = process.env.DO_SPACES_BUCKET || '';

    await spacesClient.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ACL: 'private',
        })
    );

    const endpoint = process.env.DO_SPACES_ENDPOINT || '';
    const baseUrl = endpoint.replace('https://', `https://${bucket}.`);
    return `${baseUrl}/${key}`;
}
