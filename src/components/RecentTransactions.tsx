'use client';

export default function RecentTransactions({ transactions }: { transactions: any[] }) {
  if (!transactions) return <div>Loading transactions...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
      <h2 className="text-lg font-bold mb-4 text-black">Recent Transactions</h2>
      
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-sm">No transactions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-black uppercase bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 rounded-tr-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-100 last:border-0 text-gray-800">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.type === 'sale' ? 'bg-black text-white' : 
                      tx.type === 'purchase' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-200 text-black'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{tx.product || '-'}</td>
                  <td className="px-4 py-3">{tx.quantity || '-'}</td>
                  <td className="px-4 py-3 capitalize">{tx.customer || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tx.payment_type === 'cash' ? 'bg-gray-100 text-black' : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.payment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">UGX {tx.amount?.toLocaleString() || '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
