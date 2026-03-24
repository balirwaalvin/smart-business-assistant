'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign, ShoppingCart, TrendingUp, Users, AlertCircle,
  Package, CreditCard, Wallet, ArrowRight, TrendingDown, Activity, X, Plus, CheckCircle
} from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

interface Metrics {
  cashRevenue?: number;
  creditSalesRevenue?: number;
  totalPurchases?: number;
  outstandingCredit?: number;
  totalExpenses?: number;
  netProfitLoss?: number;
  isProfit?: boolean;
  lowStockItems?: Array<{ product: string; quantity: number; threshold: number }>;
}

interface InventoryItem {
  id: string;
  product: string;
  quantity: number;
  low_stock_threshold: number;
}

interface AiInsights {
  source: 'claude' | 'fallback';
  overview: string;
  recommendations: string[];
  statistics: {
    cashPosition: string;
    salesMomentum: string;
    stockRisk: string;
    creditRisk: string;
  };
  cardAdvice: Record<string, string>;
}

type TransactionType = 'cashPurchase' | 'creditPurchase' | 'cashSale' | 'creditSale' | 'expense' | 'drawing' | null;

export default function DoubleEntryDashboard({ metrics, onTransactionAdded }: { metrics: Metrics | null; onTransactionAdded?: () => void }) {
  const { lang, isLuganda } = useLang();
  const [selectedPurchaseModal, setSelectedPurchaseModal] = useState<'cash' | 'credit' | null>(null);
  const [selectedSaleModal, setSelectedSaleModal] = useState<'cash' | 'credit' | null>(null);
  const [selectedExpenseModal, setSelectedExpenseModal] = useState<'expense' | 'drawing' | null>(null);
  const [formData, setFormData] = useState({
    item: '',
    customItem: '',
    unit: 'units',
    quantity: '',
    amount: '',
    partnerName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPurchaseMenu, setShowPurchaseMenu] = useState(false);
  const [showSaleMenu, setShowSaleMenu] = useState(false);
  const [showExpenseMenu, setShowExpenseMenu] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ product: '', quantity: '', unit: 'units', lowStockThreshold: '5' });
  const [stockMessage, setStockMessage] = useState<string | null>(null);
  const [lowStockReminder, setLowStockReminder] = useState<string | null>(null);
  const [aiOverview, setAiOverview] = useState<string | null>(null);
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<string>('cash');

  const cardLabel: Record<string, string> = {
    purchases: isLuganda ? 'Ebiguliddwa Byonna' : 'Total Purchases',
    purchasesCash: isLuganda ? 'Ebiguliddwa (Cash)' : 'Purchases (Cash)',
    purchasesCredit: isLuganda ? 'Ebiguliddwa (Credit)' : 'Purchases (Credit)',
    creditors: isLuganda ? 'Ababanja (Suppliers)' : 'Creditors (Suppliers)',
    expenses: isLuganda ? 'Ensaasaanya (Drawings)' : 'Expenses (Drawings)',
    cash: isLuganda ? 'Ensimbi Eziriwo' : 'Cash On Hand',
    stock: isLuganda ? 'Sitooko / Inventory' : 'Stock / Inventory',
    profit: isLuganda ? 'Amagoba / Okufiirwa' : 'Net Profit/Loss',
    sales: isLuganda ? 'Entunda Zonna' : 'Total Sales',
    salesCash: isLuganda ? 'Entunda (Cash)' : 'Sales (Cash)',
    salesCredit: isLuganda ? 'Entunda (Credit)' : 'Sales (Credit)',
    debtors: isLuganda ? 'Ababanja (Customers)' : 'Debtors (Customers)',
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setInventoryItems(Array.isArray(data) ? data : []);
    } catch {
      // Ignore non-critical inventory fetch failures in dashboard UI
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await fetch(`/api/insights?lang=${lang}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Session can expire while dashboard is mounted; avoid noisy console errors.
          return;
        }

        const errorMsg = data.details || data.error || 'Unknown error';
        console.warn('⚠️ TUNDA AI insights request failed, using previous dashboard state:', {
          status: response.status,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Log source for transparency
      if (data.source === 'fallback') {
        console.warn('⚠️ TUNDA AI is running in fallback mode.');
      }

      setInsights({
        source: data.source,
        overview: data.overview,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        statistics: data.statistics,
        cardAdvice: data.cardAdvice || {},
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('🔴 TUNDA AI Fetch Error - Fallback Mode Triggered:', {
        message: errorMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [metrics, lang]);

  const extractUnitFromProduct = (productName: string) => {
    const match = productName.match(/\(([^)]+)\)\s*$/);
    return match ? match[1].trim() : 'units';
  };

  const handleSubmitTransaction = async (type: 'cashPurchase' | 'creditPurchase' | 'cashSale' | 'creditSale' | 'expense' | 'drawing') => {
    const isExpenseType = type === 'expense' || type === 'drawing';
    
    const normalizedUnit = String(formData.unit || 'units').trim();
    const resolvedProduct = formData.item === '__new__'
      ? (normalizedUnit !== 'units' ? `${formData.customItem.trim()} (${normalizedUnit})` : formData.customItem.trim())
      : formData.item.trim();

    if (isExpenseType) {
      // For expenses/drawings, we don't need quantity or partner name
      if (!formData.item.trim() || !formData.amount) {
        setErrorMessage(isLuganda ? 'Jjuza ebifo byonna ebyetaagisa.' : 'Please fill in all required fields');
        return;
      }
    } else {
      // For purchase/sale, we need all fields
      if (!resolvedProduct || !formData.quantity || !formData.amount || !formData.partnerName.trim()) {
        setErrorMessage(isLuganda ? 'Jjuza ebifo byonna.' : 'Please fill in all fields');
        return;
      }

      if ((type === 'cashSale' || type === 'creditSale') && formData.item === '__new__') {
        setErrorMessage(isLuganda ? 'Entunda erina okukozesa stock item eriwo. Sooka oyongere stock.' : 'Sales must use an existing stock item. Add stock first.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAiOverview(null);

    try {
      let apiTransactionType: string = '';
      let paymentType = 'cash';
      let product = resolvedProduct;
      let quantity = 1;
      let notes = '';

      if (type === 'cashPurchase' || type === 'creditPurchase') {
        apiTransactionType = 'purchase';
        paymentType = type === 'cashPurchase' ? 'cash' : 'credit';
        notes = `Supplier: ${formData.partnerName}`;
        quantity = parseFloat(formData.quantity);
      } else if (type === 'cashSale' || type === 'creditSale') {
        apiTransactionType = 'sale';
        paymentType = type === 'cashSale' ? 'cash' : 'credit';
        notes = `Customer: ${formData.partnerName}`;
        quantity = parseFloat(formData.quantity);
      } else if (type === 'expense' || type === 'drawing') {
        apiTransactionType = type;
        notes = `Description: ${formData.item}`;
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: apiTransactionType,
          product: product,
          quantity: quantity,
          amount: parseFloat(formData.amount),
          payment_type: paymentType,
          notes: notes,
          lang,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to record transaction');
      }

      const payload = await response.json();

      if (payload?.overview) {
        setAiOverview(String(payload.overview));
      }

      if (payload?.lowStockAlert?.product) {
        setLowStockReminder(
          isLuganda
            ? `TUNDA AI Okulabula: ${payload.lowStockAlert.product} kiri ku mutendera mutono (${payload.lowStockAlert.quantity} zisigaddeyo, threshold ${payload.lowStockAlert.threshold}). Yongera stock mangu.`
            : `TUNDA AI Alert: ${payload.lowStockAlert.product} is running low (${payload.lowStockAlert.quantity} left, threshold ${payload.lowStockAlert.threshold}). Please restock soon.`
        );
      }

      setSuccessMessage(
        isLuganda
          ? 'Transaction ewandikiddwa bulungi!'
          : `${type.charAt(0).toUpperCase() + type.slice(1)} recorded successfully!`
      );
      setFormData({ item: '', customItem: '', unit: 'units', quantity: '', amount: '', partnerName: '' });
      setSelectedPurchaseModal(null);
      setSelectedSaleModal(null);
      setSelectedExpenseModal(null);
      setShowPurchaseMenu(false);
      setShowSaleMenu(false);
      setShowExpenseMenu(false);
      
      setTimeout(() => {
        setSuccessMessage(null);
        setAiOverview(null);
        onTransactionAdded?.();
        fetchInventory();
        fetchInsights();
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : (isLuganda ? 'Wabaddewo ensobi mu kuwandiika transaction.' : 'Error recording transaction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!metrics) {
    return (
      <div className="space-y-8">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cashOnHand = metrics.cashRevenue || 0;
  const totalStockUnits = inventoryItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  const netPL = metrics.netProfitLoss || 0;
  const isProfit = metrics.isProfit !== false;

  const cashSales = metrics.cashRevenue || 0;
  const creditSales = metrics.creditSalesRevenue || 0;
  const totalSales = cashSales + creditSales;

  const cashPurchases = metrics.totalPurchases || 0; // In real scenario, separate cash/credit purchases
  const creditPurchases = 0; // To be tracked separately
  const totalPurchases = metrics.totalPurchases || 0;

  const debtorsBalance = metrics.outstandingCredit || 0;
  const creditorsBalance = 0; // To be tracked from supplier credit

  const expenses = metrics.totalExpenses || 0;
  const lowStockItems = metrics.lowStockItems || [];

  const handleAddStock = async () => {
    const product = stockForm.product.trim();
    const quantity = Number(stockForm.quantity);
    const unit = String(stockForm.unit || 'units').trim();
    const lowStockThreshold = Number(stockForm.lowStockThreshold) || 5;

    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      setStockMessage(isLuganda ? 'Wandiika erinnya lya stock n’obungi obusinga ku zero.' : 'Please enter a stock name and quantity greater than zero.');
      return;
    }

    setStockMessage(null);
    try {
      const productWithUnit = unit && unit !== 'units' ? `${product} (${unit})` : product;

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'add-stock',
          product: productWithUnit,
          quantity,
          low_stock_threshold: lowStockThreshold,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to add stock');
      }

      setStockMessage(isLuganda ? `Stock etereezeddwa: ${productWithUnit} +${quantity}` : `Stock updated: ${productWithUnit} +${quantity}`);
      setStockForm({ product: '', quantity: '', unit: 'units', lowStockThreshold: '5' });
      setIsStockModalOpen(false);
      fetchInventory();
      onTransactionAdded?.();
    } catch (error) {
      setStockMessage(error instanceof Error ? error.message : (isLuganda ? 'Tetusobodde kwongera stock' : 'Failed to add stock'));
    }
  };

  const AccountCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    onClick,
    isSelected,
    isClickable,
  }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    color: string;
    onClick?: () => void;
    isSelected?: boolean;
    isClickable?: boolean;
  }) => (
    <div
      onClick={onClick}
      className={`p-5 rounded-lg border-2 transition-all ${
        isClickable ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? `border-${color}-500 bg-${color}-50 shadow-md`
          : `border-gray-200 bg-white ${isClickable ? 'hover:border-gray-400 hover:shadow-md' : ''}`
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        {isClickable && <Plus className="w-4 h-4 text-gray-400" />}
      </div>
      <h3 className="text-xs font-semibold text-gray-600 mb-1">{title}</h3>
      <p className={`text-2xl font-bold text-${color}-700`}>
        {typeof value === 'number' ? `UGX ${value.toLocaleString()}` : value}
      </p>
      <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
    </div>
  );

  const ColumnHeader = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-4 pb-3 border-b-2 border-gray-300">
      <h2 className="text-lg font-bold text-black">{title}</h2>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
    </div>
  );

  const renderTransactionModal = ({
    isOpen,
    title,
    subtitle,
    accountingExplain,
    buttonText,
    onSubmit,
    onClose,
    type,
  }: {
    isOpen: boolean;
    title: string;
    subtitle: string;
    accountingExplain: string;
    buttonText: string;
    onSubmit: () => void;
    onClose: () => void;
    type: 'cashPurchase' | 'creditPurchase' | 'cashSale' | 'creditSale' | 'expense' | 'drawing';
  }) => {
    if (!isOpen) return null;
    
    const isExpenseType = type === 'expense' || type === 'drawing';
    const isPurchaseType = type.includes('Purchase');
    const isSaleType = type.includes('Sale');
    const isStockLinkedType = isPurchaseType || isSaleType;

    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" 
        onClick={(e) => {
          // Only close if clicking directly on the overlay background, not on the modal
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-black">{title}</h2>
              <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Accounting Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
            <div className="font-semibold mb-2">{isLuganda ? '📊 Enkyukakyuka mu Accounting:' : '📊 Accounting Impact:'}</div>
            <div className="space-y-1 font-mono text-xs">{accountingExplain}</div>
          </div>

          {/* Form */}
          <form 
            className="space-y-3 mb-4"
            onSubmit={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Different label based on transaction type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isExpenseType ? (isLuganda ? 'Ennyonyola' : 'Description') : (isLuganda ? 'Erinnya ly’Ekintu/Product' : 'Item/Product Name')}
              </label>
              {isExpenseType ? (
                <input
                  type="text"
                  placeholder={
                    type === 'expense'
                      ? (isLuganda ? 'e.g., Rent, Amazi n’amasannyalaze, Maintenance' : 'e.g., Rent, Utilities, Maintenance')
                      : (isLuganda ? 'e.g., Kuggyayo cash, Owner draw' : 'e.g., Cash withdrawal, Owner draw')
                  }
                  autoComplete="off"
                  spellCheck="false"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                />
              ) : (
                <div className="space-y-2">
                  <select
                    value={formData.item}
                    onChange={(e) => {
                      const nextItem = e.target.value;
                      const detectedUnit = nextItem && nextItem !== '__new__' ? extractUnitFromProduct(nextItem) : formData.unit;
                      setFormData({ ...formData, item: nextItem, unit: detectedUnit });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  >
                    <option value="">{isLuganda ? 'Londa stock item' : 'Select stock item'}</option>
                    {inventoryItems.map((stockItem) => (
                      <option key={stockItem.id} value={stockItem.product}>
                        {stockItem.product} ({stockItem.quantity} {isLuganda ? 'mu stock' : 'in stock'})
                      </option>
                    ))}
                    {isPurchaseType && <option value="__new__">{isLuganda ? '+ Yongera stock item empya' : '+ Add new stock item'}</option>}
                  </select>

                  {isPurchaseType && formData.item === '__new__' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder={isLuganda ? 'Wandiika erinnya lya stock item empya' : 'Enter new stock item name'}
                        autoComplete="off"
                        spellCheck="false"
                        value={formData.customItem}
                        onChange={(e) => setFormData({ ...formData, customItem: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                      />
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                      >
                        <option value="units">{isLuganda ? 'Yuniti' : 'Units'}</option>
                        <option value="kg">{isLuganda ? 'Kilogulaamu (kg)' : 'Kilograms (kg)'}</option>
                        <option value="g">{isLuganda ? 'Gulaamu (g)' : 'Grams (g)'}</option>
                        <option value="litres">{isLuganda ? 'Lita' : 'Litres'}</option>
                        <option value="ml">{isLuganda ? 'Mililita (ml)' : 'Millilitres (ml)'}</option>
                        <option value="bags">{isLuganda ? 'Bbaagi' : 'Bags'}</option>
                        <option value="boxes">{isLuganda ? 'Bbokisi' : 'Boxes'}</option>
                        <option value="packs">{isLuganda ? 'Pakiti' : 'Packs'}</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity & Amount (NOT for expenses/drawings) */}
            {!isExpenseType ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Obungi' : 'Quantity'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    autoComplete="off"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Yuniti' : 'Unit'}</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={isSaleType && formData.item !== ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="units">{isLuganda ? 'Yuniti' : 'Units'}</option>
                    <option value="kg">{isLuganda ? 'Kilogulaamu (kg)' : 'Kilograms (kg)'}</option>
                    <option value="g">{isLuganda ? 'Gulaamu (g)' : 'Grams (g)'}</option>
                    <option value="litres">{isLuganda ? 'Lita' : 'Litres'}</option>
                    <option value="ml">{isLuganda ? 'Mililita (ml)' : 'Millilitres (ml)'}</option>
                    <option value="bags">{isLuganda ? 'Bbaagi' : 'Bags'}</option>
                    <option value="boxes">{isLuganda ? 'Bbokisi' : 'Boxes'}</option>
                    <option value="packs">{isLuganda ? 'Pakiti' : 'Packs'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Ssente (UGX)' : 'Amount (UGX)'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    autoComplete="off"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Amount only for expenses/drawings */
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Ssente (UGX)' : 'Amount (UGX)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  autoComplete="off"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                />
              </div>
            )}

            {/* Partner Name (Only for purchase/sale) */}
            {!isExpenseType && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {isPurchaseType ? (isLuganda ? 'Erinnya lya Supplier' : 'Supplier Name') : (isLuganda ? 'Erinnya lya Customer' : 'Customer Name')}
                </label>
                <input
                  type="text"
                  placeholder={isPurchaseType ? (isLuganda ? 'e.g., ABC Suppliers' : 'e.g., ABC Suppliers') : (isLuganda ? 'e.g., Shoprite' : 'e.g., Shoprite')}
                  autoComplete="off"
                  spellCheck="false"
                  value={formData.partnerName}
                  onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                />
              </div>
            )}
          </form>

          {/* Messages */}
          {errorMessage && <p className="text-xs text-red-700 mb-3 bg-red-50 p-2 rounded">{errorMessage}</p>}
          {aiOverview && <p className="text-xs text-blue-700 mb-3 bg-blue-50 p-2 rounded"><span className="font-semibold">TUNDA AI:</span> {aiOverview}</p>}
          {successMessage && <p className="text-xs text-green-700 mb-3 bg-green-50 p-2 rounded">{successMessage}</p>}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {isLuganda ? 'Sazaamu' : 'Cancel'}
            </button>
            <button
              onClick={() => onSubmit()}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (isLuganda ? 'Kiwandiikibwa...' : 'Recording...') : buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PurchaseMenu = () => (
    <div className="absolute top-0 right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-30">
      <button
        onClick={() => {
          setSelectedPurchaseModal('cash');
          setShowPurchaseMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-200 flex items-center gap-2"
      >
        <DollarSign className="w-4 h-4 text-orange-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '💵 Purchase ya Cash' : '💵 Cash Purchase'}</div>
          <div className="text-xs text-gray-600">Cash ↓ Stock ↑</div>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedPurchaseModal('credit');
          setShowPurchaseMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-2"
      >
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '💳 Purchase ya Credit' : '💳 Credit Purchase'}</div>
          <div className="text-xs text-gray-600">Creditors ↑ Stock ↑</div>
        </div>
      </button>
    </div>
  );

  const SaleMenu = () => (
    <div className="absolute top-0 right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-30">
      <button
        onClick={() => {
          setSelectedSaleModal('cash');
          setShowSaleMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-lime-50 border-b border-gray-200 flex items-center gap-2"
      >
        <DollarSign className="w-4 h-4 text-lime-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '💵 Entunda ya Cash' : '💵 Cash Sale'}</div>
          <div className="text-xs text-gray-600">Cash ↑ Stock ↓</div>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedSaleModal('credit');
          setShowSaleMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-cyan-50 flex items-center gap-2"
      >
        <CreditCard className="w-4 h-4 text-cyan-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '🤝 Entunda ya Credit' : '🤝 Credit Sale'}</div>
          <div className="text-xs text-gray-600">Debtors ↑ Stock ↓</div>
        </div>
      </button>
    </div>
  );

  const ExpenseMenu = () => (
    <div className="absolute top-0 right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-30">
      <button
        onClick={() => {
          setSelectedExpenseModal('expense');
          setShowExpenseMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-rose-50 border-b border-gray-200 flex items-center gap-2"
      >
        <Wallet className="w-4 h-4 text-rose-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '💼 Expense ya Bizinensi' : '💼 Business Expense'}</div>
          <div className="text-xs text-gray-600">Cash ↓ Expense ↑</div>
        </div>
      </button>

      <button
        onClick={() => {
          setSelectedExpenseModal('drawing');
          setShowExpenseMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-2"
      >
        <Users className="w-4 h-4 text-purple-600" />
        <div>
          <div className="text-sm font-semibold text-gray-800">{isLuganda ? '👤 Owner Drawing' : '👤 Owner Drawing'}</div>
          <div className="text-xs text-gray-600">Cash ↓ Drawing ↑</div>
        </div>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {(lowStockReminder || lowStockItems.length > 0) && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-900 mb-2">{isLuganda ? 'TUNDA AI Okulabula ku Stock' : 'TUNDA AI Stock Reminder'}</h3>
          {lowStockReminder && <p className="text-sm text-amber-800 mb-2">{lowStockReminder}</p>}
          {lowStockItems.length > 0 && (
            <ul className="text-sm text-amber-800 space-y-1">
              {lowStockItems.map((item) => (
                <li key={item.product}>• {item.product}: {item.quantity} {isLuganda ? 'zisigaddeyo' : 'left'} ({isLuganda ? 'ekkomo' : 'threshold'} {item.threshold})</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-black to-gray-800 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold">{isLuganda ? 'Dashboard ya Double Entry Accounting' : 'Double Entry Accounting Dashboard'}</h1>
        <p className="text-gray-300 text-sm mt-2">
          {isLuganda
            ? 'Nyiga ku kitundu kyonna okuwandiika transaction. Buli ky’owandiika kijja kuddaabiriza akawunti mu ngeri yaayo.'
            : 'Click on any section to record transactions. All entries automatically update accounts.'}
        </p>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: PURCHASES & PAYABLES */}
        <div>
          <ColumnHeader
            title={isLuganda ? 'EBIGULIDDWA & SUPPLIERS' : 'PURCHASES & SUPPLIERS'}
            description={isLuganda ? 'Bye tugula ku cash oba ku credit' : 'What we buy on cash or credit'}
          />

          <div className="space-y-3">
            {/* Total Purchases - Main Clickable */}
            <div className="relative">
              <AccountCard
                title={isLuganda ? 'Ebiguliddwa Byonna' : 'Total Purchases'}
                value={`UGX ${totalPurchases.toLocaleString()}`}
                subtitle={isLuganda ? '💡 Nyiga okuwandiika purchase' : '💡 Click to record a purchase'}
                icon={ShoppingCart}
                color="orange"
                onClick={() => { setActiveCard('purchases'); setShowPurchaseMenu(!showPurchaseMenu); }}
                isClickable={true}
              />
              {showPurchaseMenu && <PurchaseMenu />}
            </div>

            {/* Cash Purchases */}
            <AccountCard
              title={isLuganda ? 'Ebiguliddwa (Cash)' : 'Purchases (Cash)'}
              value={`UGX ${cashPurchases.toLocaleString()}`}
              subtitle={isLuganda ? 'Cash ekendedde → Stock eyongedde' : 'Cash decreased → Stock increased'}
              icon={DollarSign}
              color="amber"
              onClick={() => setActiveCard('purchasesCash')}
            />

            {/* Credit Purchases */}
            <AccountCard
              title={isLuganda ? 'Ebiguliddwa (Credit)' : 'Purchases (Credit)'}
              value={`UGX ${creditPurchases.toLocaleString()}`}
              subtitle={isLuganda ? 'Creditors (Liability) beyongedde' : 'Creditors (Liability) increased'}
              icon={AlertCircle}
              color="yellow"
              onClick={() => setActiveCard('purchasesCredit')}
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Creditors / Suppliers */}
            <AccountCard
              title={isLuganda ? 'Ababanja (Suppliers)' : 'Creditors (Suppliers)'}
              value={`UGX ${creditorsBalance.toLocaleString()}`}
              subtitle={isLuganda ? 'Sente ezibanjibwa suppliers' : 'Amount owed to suppliers'}
              icon={Users}
              color="red"
              onClick={() => setActiveCard('creditors')}
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Expenses / Drawings - Clickable */}
            <div className="relative">
              <AccountCard
                title={isLuganda ? 'Ensaasaanya (Drawings)' : 'Expenses (Drawings)'}
                value={`UGX ${expenses.toLocaleString()}`}
                subtitle={isLuganda ? '💡 Nyiga okuwandiika expense oba drawing' : '💡 Click to record expense or drawing'}
                icon={Wallet}
                color="rose"
                onClick={() => { setActiveCard('expenses'); setShowExpenseMenu(!showExpenseMenu); }}
                isClickable={true}
              />
              {showExpenseMenu && <ExpenseMenu />}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: ASSETS (CASH & STOCK) */}
        <div>
          <ColumnHeader
            title={isLuganda ? 'EBIRIWO (ASSETS)' : 'ASSETS'}
            description={isLuganda ? 'Bizinensi bye erina' : 'What the business owns'}
          />

          <div className="space-y-3">
            {/* Cash - Premium positioning */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border-2 border-green-400 shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-200">
                  <DollarSign className="w-5 h-5 text-green-700" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-600 mb-1">{isLuganda ? '💰 ENSIMBI EZIRIWO' : '💰 CASH ON HAND'}</h3>
              <button onClick={() => setActiveCard('cash')} className="text-left w-full">
              <p className="text-3xl font-bold text-green-700">
                UGX {cashOnHand.toLocaleString()}
              </p>
              </button>
              <div className="mt-3 text-xs text-gray-700 space-y-1 border-t border-green-300 pt-2">
                <div className="flex justify-between">
                  <span>{isLuganda ? 'Entunda za Cash:' : 'Cash Sales:'}</span>
                  <span className="font-semibold text-green-600">+UGX {cashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isLuganda ? 'Ebiguliddwa ku Cash:' : 'Cash Purchases:'}</span>
                  <span className="font-semibold text-red-600">-UGX {cashPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isLuganda ? 'Ensaasaanya:' : 'Expenses:'}</span>
                  <span className="font-semibold text-red-600">-UGX {expenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex justify-center py-3">
              <div className="text-center text-xs font-bold text-gray-400 uppercase">{isLuganda ? '↕️ Entambula' : '↕️ Movement'}</div>
            </div>

            {/* Stock/Inventory */}
            <div className="relative">
              <AccountCard
                title={isLuganda ? '📦 Sitooko / Inventory' : '📦 Stock / Inventory'}
                value={`${totalStockUnits.toLocaleString()} ${isLuganda ? 'yuniti' : 'units'}`}
                subtitle={isLuganda ? '💡 Nyiga okwongera stock eriwo' : '💡 Click to add available stock'}
                icon={Package}
                color="blue"
                onClick={() => { setActiveCard('stock'); setIsStockModalOpen(true); }}
                isClickable={true}
              />
            </div>

            {/* Profit/Loss Summary */}
            <div
              className={`p-5 rounded-lg border-2 ${
                isProfit
                  ? 'border-green-400 bg-green-50'
                  : 'border-red-400 bg-red-50'
              }`}
              onClick={() => setActiveCard('profit')}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    isProfit ? 'bg-green-200' : 'bg-red-200'
                  }`}
                >
                  {isProfit ? (
                    <TrendingUp className="w-5 h-5 text-green-700" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-700" />
                  )}
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-600 mb-1">
                {isProfit
                  ? (isLuganda ? '📈 AMAGOBA' : '📈 NET PROFIT')
                  : (isLuganda ? '📉 OKUFIIRWA' : '📉 NET LOSS')}
              </h3>
              <p
                className={`text-2xl font-bold ${
                  isProfit ? 'text-green-700' : 'text-red-700'
                }`}
              >
                UGX {Math.abs(netPL).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {isLuganda ? 'Entunda - Ebiguliddwa - Ensaasaanya' : 'Sales - Purchases - Expenses'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SALES & RECEIVABLES */}
        <div>
          <ColumnHeader
            title={isLuganda ? 'ENTUNDA & CUSTOMERS' : 'SALES & CUSTOMERS'}
            description={isLuganda ? 'Bye tutunda ku cash oba ku credit' : 'What we sell on cash or credit'}
          />

          <div className="space-y-3">
            {/* Total Sales - Main Clickable */}
            <div className="relative">
              <AccountCard
                title={isLuganda ? 'Entunda Zonna' : 'Total Sales'}
                value={`UGX ${totalSales.toLocaleString()}`}
                subtitle={isLuganda ? '💡 Nyiga okuwandiika sale' : '💡 Click to record a sale'}
                icon={TrendingUp}
                color="green"
                onClick={() => { setActiveCard('sales'); setShowSaleMenu(!showSaleMenu); }}
                isClickable={true}
              />
              {showSaleMenu && <SaleMenu />}
            </div>

            {/* Cash Sales */}
            <AccountCard
              title={isLuganda ? 'Entunda (Cash)' : 'Sales (Cash)'}
              value={`UGX ${cashSales.toLocaleString()}`}
              subtitle={isLuganda ? 'Cash eyongedde → Stock ekendedde' : 'Cash increased → Stock decreased'}
              icon={DollarSign}
              color="lime"
              onClick={() => setActiveCard('salesCash')}
            />

            {/* Credit Sales */}
            <AccountCard
              title={isLuganda ? 'Entunda (Credit)' : 'Sales (Credit)'}
              value={`UGX ${creditSales.toLocaleString()}`}
              subtitle={isLuganda ? 'Debtors (Asset) beyongedde' : 'Debtors (Asset) increased'}
              icon={CreditCard}
              color="cyan"
              onClick={() => setActiveCard('salesCredit')}
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Debtors / Customers */}
            <AccountCard
              title={isLuganda ? 'Ababanja (Customers)' : 'Debtors (Customers)'}
              value={`UGX ${debtorsBalance.toLocaleString()}`}
              subtitle={isLuganda ? 'Sente ezibanjibwa customers' : 'Amount owed by customers'}
              icon={Users}
              color="blue"
              onClick={() => setActiveCard('debtors')}
            />
          </div>
        </div>
      </div>

      {/* Account Relationships Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-bold text-blue-900 mb-3">{isLuganda ? '💼 PURCHASES → DEBIT' : '💼 PURCHASES → DEBIT'}</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>{isLuganda ? '🛒 Cash Buy: Cash ↓ | Stock ↑' : '🛒 Cash Buy: Cash ↓ | Stock ↑'}</li>
            <li>{isLuganda ? '💳 Credit Buy: Creditors ↑ | Stock ↑' : '💳 Credit Buy: Creditors ↑ | Stock ↑'}</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h3 className="font-bold text-green-900 mb-3">{isLuganda ? '📊 SALES → CREDIT' : '📊 SALES → CREDIT'}</h3>
          <ul className="text-sm text-green-800 space-y-2">
            <li>{isLuganda ? '💵 Cash Sell: Cash ↑ | Stock ↓' : '💵 Cash Sell: Cash ↑ | Stock ↓'}</li>
            <li>{isLuganda ? '🤝 Credit Sell: Debtors ↑ | Stock ↓' : '🤝 Credit Sell: Debtors ↑ | Stock ↓'}</li>
          </ul>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-5">
          <h3 className="font-bold text-rose-900 mb-3">💼 EXPENSES → DEBIT</h3>
          <ul className="text-sm text-rose-800 space-y-2">
            <li>{isLuganda ? '🪧 Business: Expense ↑ | Cash ↓' : '🪧 Business: Expense ↑ | Cash ↓'}</li>
            <li>{isLuganda ? '📋 Ensaasaanya z’emirimu ez’enjawulo' : '📋 Various operating costs'}</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
          <h3 className="font-bold text-purple-900 mb-3">🏦 DRAWINGS → DEBIT</h3>
          <ul className="text-sm text-purple-800 space-y-2">
            <li>{isLuganda ? '💰 Withdrawal: Drawing ↑ | Cash ↓' : '💰 Withdrawal: Drawing ↑ | Cash ↓'}</li>
            <li>{isLuganda ? '📌 Enkozesa y’omuntu ku bubwe' : '📌 Owner personal use'}</li>
          </ul>
        </div>
      </div>

      {/* Expression of Double Entry */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm font-mono text-gray-700">
          <span className="font-bold">{isLuganda ? 'Assets (Cash + Stock) = Liabilities (Creditors) + Equity (Amagoba - Drawings)' : 'Assets (Cash + Stock) = Liabilities (Creditors) + Equity (Profit - Drawings)'}</span>
        </p>
      </div>

      {/* TUNDA AI Insights & Statistics - Below Dashboard */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-bold text-black">{isLuganda ? 'TUNDA AI Okutegeera & Emibalo' : 'TUNDA AI Insights & Statistics'}</h3>
            <p className="text-xs text-gray-600 mt-1">{isLuganda ? 'Obuyambi mu kusalawo nga businziira ku biwandiiko bya bizinensi byo ebya kati.' : 'Decision support based on your current business records.'}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              insights?.source === 'claude'
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {insights?.source === 'claude'
              ? (isLuganda ? 'TUNDA AI: Ekola' : 'TUNDA AI: Active')
              : (isLuganda ? 'TUNDA AI: Fallback Mode' : 'TUNDA AI: Fallback Mode')}
          </span>
        </div>

        {insightsLoading ? (
          <p className="text-sm text-gray-500 mt-3">{isLuganda ? 'TUNDA AI eri kukola okutegeera...' : 'Generating AI insights...'}</p>
        ) : (
          <>
            {insights?.source === 'fallback' && (
              <p className="text-xs text-amber-600 mb-2 bg-amber-50 p-2 rounded">{isLuganda ? '💡 Eri mu Fallback Mode. Kebera browser console (F12 → Console) okulaba ensobi.' : '💡 Running in Fallback Mode. Check browser console (F12 → Console tab) for error details.'}</p>
            )}
            <p className="text-sm text-gray-800 mt-3">{insights?.overview || (isLuganda ? 'Okutegeera kujja kulabika oluvannyuma lw’okutikka biwandiiko byo.' : 'Insights will appear after your records are loaded.')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
              <div className="rounded-lg border border-gray-200 p-3"><span className="font-semibold">{isLuganda ? 'Cash' : 'Cash'}:</span> {insights?.statistics?.cashPosition || 'N/A'}</div>
              <div className="rounded-lg border border-gray-200 p-3"><span className="font-semibold">{isLuganda ? 'Sales' : 'Sales'}:</span> {insights?.statistics?.salesMomentum || 'N/A'}</div>
              <div className="rounded-lg border border-gray-200 p-3"><span className="font-semibold">{isLuganda ? 'Stock' : 'Stock'}:</span> {insights?.statistics?.stockRisk || 'N/A'}</div>
              <div className="rounded-lg border border-gray-200 p-3"><span className="font-semibold">{isLuganda ? 'Credit' : 'Credit'}:</span> {insights?.statistics?.creditRisk || 'N/A'}</div>
            </div>
            {insights?.recommendations?.length ? (
              <ul className="mt-4 text-sm text-gray-800 space-y-1">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* TUNDA AI Follow Menu */}
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <h3 className="text-sm font-bold text-cyan-900">{isLuganda ? 'Menu y’Obulagirizi' : 'Follow Menu'}: {cardLabel[activeCard] || (isLuganda ? 'Londa kaadi' : 'Select a card')}</h3>
        <p className="text-sm text-cyan-800 mt-2">
          {insights?.cardAdvice?.[activeCard] || (isLuganda ? 'Nyiga ku kaadi yonna ku dashboard ofune obulagirizi bwa TUNDA AI obutunuulidde ekitundu ekyo.' : 'Click any dashboard card to get focused TUNDA AI guidance for that section.')}
        </p>
      </div>

      {/* Transaction Modals */}
      {renderTransactionModal({
        isOpen: selectedPurchaseModal === 'cash',
        title: isLuganda ? '💵 Wandiika Cash Purchase' : '💵 Record Cash Purchase',
        subtitle: isLuganda ? 'Bw’ogula ebintu n’osasuula cash mangu ago' : 'When you buy items paying cash immediately',
        accountingExplain: 'Stock Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Cash Purchase' : 'Record Cash Purchase',
        type: 'cashPurchase',
        onSubmit: () => handleSubmitTransaction('cashPurchase'),
        onClose: () => setSelectedPurchaseModal(null),
      })}

      {renderTransactionModal({
        isOpen: selectedPurchaseModal === 'credit',
        title: isLuganda ? '💳 Wandiika Credit Purchase' : '💳 Record Credit Purchase',
        subtitle: isLuganda ? 'Bw’ogula ebintu ku kirediti okuva eri supplier' : 'When you buy items on credit from supplier',
        accountingExplain: 'Stock Account ↑ (DEBIT) | Creditors Account ↑ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Credit Purchase' : 'Record Credit Purchase',
        type: 'creditPurchase',
        onSubmit: () => handleSubmitTransaction('creditPurchase'),
        onClose: () => setSelectedPurchaseModal(null),
      })}

      {renderTransactionModal({
        isOpen: selectedSaleModal === 'cash',
        title: isLuganda ? '💵 Wandiika Cash Sale' : '💵 Record Cash Sale',
        subtitle: isLuganda ? 'Bw’otunda ebintu n’ofuna cash mangu ago' : 'When you sell items and receive cash immediately',
        accountingExplain: 'Cash Account ↑ (DEBIT) | Sales/Stock Account ↓ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Cash Sale' : 'Record Cash Sale',
        type: 'cashSale',
        onSubmit: () => handleSubmitTransaction('cashSale'),
        onClose: () => setSelectedSaleModal(null),
      })}

      {renderTransactionModal({
        isOpen: selectedSaleModal === 'credit',
        title: isLuganda ? '🤝 Wandiika Credit Sale' : '🤝 Record Credit Sale',
        subtitle: isLuganda ? 'Bw’otunda ebintu ku kirediti eri customer' : 'When you sell items on credit to customer',
        accountingExplain: 'Debtors Account ↑ (DEBIT) | Sales Account ↑ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Credit Sale' : 'Record Credit Sale',
        type: 'creditSale',
        onSubmit: () => handleSubmitTransaction('creditSale'),
        onClose: () => setSelectedSaleModal(null),
      })}

      {renderTransactionModal({
        isOpen: selectedExpenseModal === 'expense',
        title: isLuganda ? '💼 Wandiika Expense ya Bizinensi' : '💼 Record Business Expense',
        subtitle: isLuganda ? 'Bw’oba olina ensaasaanya z’emirimu gya bizinensi' : 'When the business incurs an operating expense',
        accountingExplain: 'Expense Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Expense' : 'Record Expense',
        type: 'expense',
        onSubmit: () => handleSubmitTransaction('expense'),
        onClose: () => setSelectedExpenseModal(null),
      })}

      {renderTransactionModal({
        isOpen: selectedExpenseModal === 'drawing',
        title: isLuganda ? '👤 Wandiika Owner Drawing' : '👤 Record Owner Drawing',
        subtitle: isLuganda ? 'Bw’omannyinimu aggya cash mu bizinensi' : 'When the owner withdraws cash from the business',
        accountingExplain: 'Drawing Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)',
        buttonText: isLuganda ? 'Wandiika Drawing' : 'Record Drawing',
        type: 'drawing',
        onSubmit: () => handleSubmitTransaction('drawing'),
        onClose: () => setSelectedExpenseModal(null),
      })}

      {isStockModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsStockModalOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-black">{isLuganda ? '📦 Yongera Stock Eriwo' : '📦 Add Available Stock'}</h2>
                <p className="text-xs text-gray-600 mt-1">{isLuganda ? 'Goberera ebintu ebiriwo eby’okutunda' : 'Track what is currently available for sales'}</p>
              </div>
              <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Erinnya lya Stock' : 'Stock Name'}</label>
                <input
                  type="text"
                  placeholder={isLuganda ? 'e.g., Sukali 1kg' : 'e.g., Sugar 1kg'}
                  value={stockForm.product}
                  onChange={(e) => setStockForm({ ...stockForm, product: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Obungi bw’okwongera' : 'Quantity to Add'}</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Yuniti' : 'Unit'}</label>
                  <select
                    value={stockForm.unit}
                    onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  >
                    <option value="units">{isLuganda ? 'Yuniti' : 'Units'}</option>
                    <option value="kg">{isLuganda ? 'Kilogulaamu (kg)' : 'Kilograms (kg)'}</option>
                    <option value="g">{isLuganda ? 'Gulaamu (g)' : 'Grams (g)'}</option>
                    <option value="litres">{isLuganda ? 'Lita' : 'Litres'}</option>
                    <option value="ml">{isLuganda ? 'Mililita (ml)' : 'Millilitres (ml)'}</option>
                    <option value="bags">{isLuganda ? 'Bbaagi' : 'Bags'}</option>
                    <option value="boxes">{isLuganda ? 'Bbokisi' : 'Boxes'}</option>
                    <option value="packs">{isLuganda ? 'Pakiti' : 'Packs'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{isLuganda ? 'Ekkomo lya Low Stock' : 'Low Stock Threshold'}</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={stockForm.lowStockThreshold}
                    onChange={(e) => setStockForm({ ...stockForm, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {stockMessage && <p className="text-xs text-blue-700 mb-3 bg-blue-50 p-2 rounded">{stockMessage}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {isLuganda ? 'Sazaamu' : 'Cancel'}
              </button>
              <button
                onClick={handleAddStock}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
              >
                {isLuganda ? 'Yongera Stock' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
