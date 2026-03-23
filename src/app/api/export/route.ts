import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAllRecordsForExport } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDateRaw = searchParams.get('from');
    const toDateRaw = searchParams.get('to');

    const fromDate = fromDateRaw ? new Date(fromDateRaw) : null;
    const toDate = toDateRaw ? new Date(toDateRaw) : null;

    if ((fromDateRaw && Number.isNaN(fromDate?.getTime())) || (toDateRaw && Number.isNaN(toDate?.getTime()))) {
      return NextResponse.json({ error: 'Invalid date filter' }, { status: 400 });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json({ error: 'From date must be before to date' }, { status: 400 });
    }

    const data = await getAllRecordsForExport(userId, {
      fromDate: fromDate ? fromDate.toISOString() : undefined,
      toDate: toDate ? toDate.toISOString() : undefined,
    });

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        Exported_At: new Date().toISOString(),
        Filter_From: fromDate ? fromDate.toISOString().slice(0, 10) : 'All time',
        Filter_To: toDate ? toDate.toISOString().slice(0, 10) : 'All time',
        Total_Transactions: data.transactions.length,
        Total_Inventory_Items: data.inventory.length,
        Total_Credit_Accounts: data.creditLedger.length,
      },
    ]);

    const transactionsSheet = XLSX.utils.json_to_sheet(
      data.transactions.map((row) => ({
        ID: row.id,
        Date: row.date ? new Date(row.date).toISOString() : '',
        Type: row.type,
        Product: row.product || '',
        Quantity: Number(row.quantity || 0),
        Customer: row.customer || '',
        Payment_Type: row.payment_type || '',
        Amount_UGX: Number(row.amount || 0),
        Cost_Price_UGX: Number(row.cost_price || 0),
      }))
    );

    const inventorySheet = XLSX.utils.json_to_sheet(
      data.inventory.map((row) => ({
        ID: row.id,
        Product: row.product,
        Quantity: Number(row.quantity || 0),
        Selling_Price_UGX: Number(row.price || 0),
        Cost_Price_UGX: Number(row.cost_price || 0),
        Low_Stock_Threshold: Number(row.low_stock_threshold || 0),
      }))
    );

    const creditSheet = XLSX.utils.json_to_sheet(
      data.creditLedger.map((row) => ({
        ID: row.id,
        Customer: row.customer,
        Balance_UGX: Number(row.balance || 0),
      }))
    );

    const productProfitsSheet = XLSX.utils.json_to_sheet(
      data.productProfits.map((row) => ({
        Product: row.product,
        Sales_UGX: Number(row.sales_total || 0),
        Sold_Qty: Number(row.sold_qty || 0),
        Purchase_Qty: Number(row.purchased_qty || 0),
        Unit_Cost_UGX: Number(row.unit_cost || 0),
        Estimated_COGS_UGX: Number(row.estimated_cogs || 0),
        Purchases_UGX: Number(row.purchase_total || 0),
        Profit_UGX: Number(row.profit || 0),
      }))
    );

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, creditSheet, 'Credit Ledger');
    XLSX.utils.book_append_sheet(workbook, productProfitsSheet, 'Product Profit');

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const dateSuffix = new Date().toISOString().slice(0, 10);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="business-records-${dateSuffix}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting records:', error);
    return NextResponse.json({ error: 'Failed to export records' }, { status: 500 });
  }
}
