import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as XLSX from 'xlsx';
import { uploadToSpaces } from '@/lib/spaces';
import { analyzeExcelRows } from '@/lib/ai';
import { addTransaction } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
        ];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) are allowed' }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Upload raw Excel file to DigitalOcean Spaces
        let fileUrl = '';
        try {
            fileUrl = await uploadToSpaces(buffer, file.name, userId);
        } catch (uploadError) {
            console.warn('Spaces upload failed (continuing without storage):', uploadError);
            // Don't block processing if Spaces isn't configured yet
        }

        // Step 2: Parse Excel file using xlsx
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Excel file appears to be empty' }, { status: 400 });
        }

        if (rows.length > 500) {
            return NextResponse.json({ error: 'Excel file too large. Maximum 500 rows allowed.' }, { status: 400 });
        }

        // Step 3: Send rows to Groq for AI analysis
        const analyzedTransactions = await analyzeExcelRows(rows);

        if (analyzedTransactions.length === 0) {
            return NextResponse.json({ error: 'Could not extract transactions from the file' }, { status: 422 });
        }

        // Step 4: Save each transaction to the database
        let successCount = 0;
        const errors: string[] = [];

        for (const tx of analyzedTransactions) {
            try {
                await addTransaction(tx, userId);
                successCount++;
            } catch (err: any) {
                errors.push(err.message || 'Unknown error');
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: rows.length,
            imported: successCount,
            failed: analyzedTransactions.length - successCount,
            fileUrl: fileUrl || null,
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Return first 5 errors
        });
    } catch (error) {
        console.error('Error processing Excel upload:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}

// Allow large file uploads (up to 10MB)
export const config = {
    api: {
        bodyParser: false,
    },
};
