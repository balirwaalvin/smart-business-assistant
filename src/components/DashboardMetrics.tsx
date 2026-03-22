'use client';

import {
  DollarSign, TrendingUp, TrendingDown, CreditCard,
  Package, ShoppingCart, AlertTriangle, Activity, BarChart2, Wallet
} from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

export default function DashboardMetrics({ metrics }: { metrics: any }) {
  const { t } = useLang();
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const netPL = metrics.netProfitLoss ?? 0;
  const isProfit = metrics.isProfit ?? true;

  return (
    <div className="space-y-6 mb-8">
      {/* --- Row 1: Core Financial Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Revenue */}
        <MetricCard
          title={t('cashRevenue')}
          value={`UGX ${(metrics.cashRevenue || 0).toLocaleString()}`}
          subtitle={t('cashRevenueSubtitle')}
          icon={<DollarSign className="w-5 h-5 text-black" />}
          iconBg="bg-gray-100"
          valueColor="text-black"
        />

        {/* Gross Revenue */}
        <MetricCard
          title={t('grossRevenue')}
          value={`UGX ${(metrics.grossRevenue || 0).toLocaleString()}`}
          subtitle={t('grossRevenueSubtitle')}
          icon={<BarChart2 className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          valueColor="text-blue-700"
        />

        {/* Total Stock Purchased */}
        <MetricCard
          title={t('stockPurchased')}
          value={`UGX ${(metrics.totalPurchases || 0).toLocaleString()}`}
          subtitle={t('stockPurchasedSubtitle')}
          icon={<ShoppingCart className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-50"
          valueColor="text-orange-700"
        />

        {/* Outstanding Credit */}
        <MetricCard
          title={t('outstandingCredit')}
          value={`UGX ${(metrics.outstandingCredit || 0).toLocaleString()}`}
          subtitle={t('outstandingCreditSubtitle')}
          icon={<CreditCard className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          valueColor="text-purple-700"
        />
      </div>

      {/* --- Row 2: Profit/Loss + Stats --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net Profit / Loss */}
        <div className={`p-6 rounded-xl shadow-sm border flex flex-col ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 rounded-lg ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
              {isProfit
                ? <TrendingUp className="w-5 h-5 text-green-600" />
                : <TrendingDown className="w-5 h-5 text-red-600" />
              }
            </div>
            <h3 className="text-sm font-bold text-gray-700">
              {isProfit ? t('netProfit') : t('netLoss')}
            </h3>
          </div>
          <p className={`text-2xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
            UGX {Math.abs(netPL).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{t('netProfitSubtitle')}</p>
        </div>

        {/* Total Expenses */}
        <MetricCard
          title={t('totalExpenses')}
          value={`UGX ${(metrics.totalExpenses || 0).toLocaleString()}`}
          subtitle={t('totalExpensesSubtitle')}
          icon={<Wallet className="w-5 h-5 text-rose-600" />}
          iconBg="bg-rose-50"
          valueColor="text-rose-700"
        />

        {/* Weekly Revenue */}
        <MetricCard
          title={t('last7DaysRevenue')}
          value={`UGX ${(metrics.weeklyRevenue || 0).toLocaleString()}`}
          subtitle={t('last7DaysSubtitle')}
          icon={<Activity className="w-5 h-5 text-teal-600" />}
          iconBg="bg-teal-50"
          valueColor="text-teal-700"
        />

        {/* Credit Sales */}
        <MetricCard
          title={t('creditSales')}
          value={`UGX ${(metrics.creditSalesRevenue || 0).toLocaleString()}`}
          subtitle={t('creditSalesSubtitle')}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          valueColor="text-indigo-700"
        />

        {/* Total Transactions */}
        <MetricCard
          title={t('totalTransactions')}
          value={(metrics.totalTransactions || 0).toLocaleString()}
          subtitle={t('totalTransactionsSubtitle')}
          icon={<Activity className="w-5 h-5 text-gray-600" />}
          iconBg="bg-gray-100"
          valueColor="text-gray-800"
        />
      </div>

      {/* --- Row 3: Products & Low Stock Alerts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-black">{t('topProducts')}</h3>
          </div>
          {metrics.topProducts && metrics.topProducts.length > 0 ? (
            <ul className="space-y-2">
              {metrics.topProducts.map((p: any, i: number) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-gray-800 capitalize font-medium">{p.product}</span>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">{p.total_sold} {t('units')} · </span>
                    <span className="font-bold text-black">UGX {(p.total_revenue || 0).toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">{t('noSalesYet')}</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-black">{t('lowStockAlerts')}</h3>
          </div>
          {metrics.lowStockItems && metrics.lowStockItems.length > 0 ? (
            <ul className="space-y-2">
              {metrics.lowStockItems.map((item: any, i: number) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-gray-800 capitalize font-medium">{item.product}</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                    item.quantity === 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.quantity === 0 ? t('outOfStock') : `${item.quantity} ${t('stockLeft')}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <span className="text-xl">✓</span>
              <p className="text-sm font-medium">{t('allStockHealthy')}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Row 4: Profit by Product --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-black">{t('profitPerProductTitle')}</h3>
        </div>

        {metrics.productProfits && metrics.productProfits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-black uppercase bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 rounded-tl-md">{t('product')}</th>
                  <th className="px-3 py-2">{t('salesLabel')}</th>
                  <th className="px-3 py-2">{t('soldQtyLabel')}</th>
                  <th className="px-3 py-2">{t('estimatedCogsLabel')}</th>
                  <th className="px-3 py-2 rounded-tr-md">{t('profitLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.productProfits.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 text-gray-800">
                    <td className="px-3 py-2 capitalize font-medium">{item.product}</td>
                    <td className="px-3 py-2">UGX {(item.sales || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">{(item.soldQty || 0).toLocaleString()}</td>
                    <td className="px-3 py-2">UGX {(item.cogs || 0).toLocaleString()}</td>
                    <td className={`px-3 py-2 font-bold ${(item.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      UGX {(item.profit || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t('noProductProfitData')}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title, value, subtitle, icon, iconBg, valueColor
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center space-x-3 mb-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
