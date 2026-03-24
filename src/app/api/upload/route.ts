import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { uploadToSpaces } from '@/lib/spaces';
import { analyzeExcelRows } from '@/lib/ai';
import { addTransaction } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const userId = await requireUserId(request);
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

        // Step 1: Upload raw Excel file to Appwrite Storage
        let fileUrl = '';
        try {
            fileUrl = await uploadToSpaces(buffer, file.name, userId);
        } catch (uploadError) {
            console.warn('Appwrite storage upload failed (continuing without storage):', uploadError);
        }

        // Step 2: Parse Excel file using xlsx
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        console.log(`[Upload] File: ${file.name} | Rows parsed: ${rows.length}`);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Excel file appears to be empty' }, { status: 400 });
        }

        if (rows.length > 500) {
            return NextResponse.json({ error: 'Excel file too large. Maximum 500 rows allowed.' }, { status: 400 });
        }

        // Log column headers detected for debugging
        const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
        console.log(`[Upload] Detected columns: ${detectedColumns.join(', ')}`);

        // Step 3: Analyze rows (AI + direct-mapper fallback)
        const analyzedTransactions = await analyzeExcelRows(rows);
        console.log(`[Upload] Transactions extracted: ${analyzedTransactions.length}`);

        if (analyzedTransactions.length === 0) {
            return NextResponse.json({
                error: `Could not extract transactions from the file. Detected ${rows.length} row(s) with columns: [${detectedColumns.join(', ')}]. Please ensure your sheet has data columns like: Product/Item, Amount/Total, Date, Customer, etc.`
            }, { status: 422 });
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

        console.log(`[Upload] Saved: ${successCount} | Failed: ${analyzedTransactions.length - successCount}`);

        return NextResponse.json({
            success: true,
            totalRows: rows.length,
            imported: successCount,
            failed: analyzedTransactions.length - successCount,
            fileUrl: fileUrl || null,
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
        });
    } catch (error) {
        console.error('Error processing Excel upload:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}

