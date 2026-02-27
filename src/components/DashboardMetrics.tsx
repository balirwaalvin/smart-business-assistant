'use client';

import { DollarSign, TrendingUp, CreditCard, Package } from 'lucide-react';

export default function DashboardMetrics({ metrics }: { metrics: any }) {
  if (!metrics) return <div className="animate-pulse flex space-x-4">Loading metrics...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard 
        title="Total Revenue" 
        value={`$${metrics.revenue.toFixed(2)}`} 
        icon={<DollarSign className="w-6 h-6 text-black" />} 
        bgColor="bg-gray-100"
      />
      <MetricCard 
        title="Estimated Profit" 
        value={`$${metrics.estimatedProfit.toFixed(2)}`} 
        icon={<TrendingUp className="w-6 h-6 text-red-600" />} 
        bgColor="bg-red-50"
      />
      <MetricCard 
        title="Outstanding Credit" 
        value={`$${metrics.outstandingCredit.toFixed(2)}`} 
        icon={<CreditCard className="w-6 h-6 text-black" />} 
        bgColor="bg-gray-100"
      />
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <Package className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-sm font-bold text-black">Top Products</h3>
        </div>
        <div className="mt-2 flex-1">
          {metrics.topProducts && metrics.topProducts.length > 0 ? (
            <ul className="space-y-1">
              {metrics.topProducts.map((p: any, i: number) => (
                <li key={i} className="text-sm flex justify-between">
                  <span className="text-gray-800 capitalize">{p.product}</span>
                  <span className="font-bold text-black">{p.total_sold}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No sales yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold text-black">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-red-600">{value}</p>
    </div>
  );
}
