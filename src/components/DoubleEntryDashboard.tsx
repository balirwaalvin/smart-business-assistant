'use client';

import { useState, useRef, useEffect } from 'react';
import {
  DollarSign, ShoppingCart, TrendingUp, Users, AlertCircle,
  Package, CreditCard, Wallet, ArrowRight, TrendingDown, Activity, X, Plus, CheckCircle
} from 'lucide-react';

interface Metrics {
  cashRevenue?: number;
  creditSalesRevenue?: number;
  totalPurchases?: number;
  outstandingCredit?: number;
  totalExpenses?: number;
  netProfitLoss?: number;
  isProfit?: boolean;
}

type TransactionType = 'cashPurchase' | 'creditPurchase' | 'cashSale' | 'creditSale' | 'expense' | 'drawing' | null;

export default function DoubleEntryDashboard({ metrics, onTransactionAdded }: { metrics: Metrics | null; onTransactionAdded?: () => void }) {
  const [selectedPurchaseModal, setSelectedPurchaseModal] = useState<'cash' | 'credit' | null>(null);
  const [selectedSaleModal, setSelectedSaleModal] = useState<'cash' | 'credit' | null>(null);
  const [selectedExpenseModal, setSelectedExpenseModal] = useState<'expense' | 'drawing' | null>(null);
  const [formData, setFormData] = useState({
    item: '',
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

  const handleSubmitTransaction = async (type: 'cashPurchase' | 'creditPurchase' | 'cashSale' | 'creditSale' | 'expense' | 'drawing') => {
    const isExpenseType = type === 'expense' || type === 'drawing';
    
    if (isExpenseType) {
      // For expenses/drawings, we don't need quantity or partner name
      if (!formData.item.trim() || !formData.amount) {
        setErrorMessage('Please fill in all required fields');
        return;
      }
    } else {
      // For purchase/sale, we need all fields
      if (!formData.item.trim() || !formData.quantity || !formData.amount || !formData.partnerName.trim()) {
        setErrorMessage('Please fill in all fields');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let apiTransactionType: string = '';
      let paymentType = 'cash';
      let product = formData.item;
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record transaction');
      }

      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} recorded successfully!`);
      setFormData({ item: '', quantity: '', amount: '', partnerName: '' });
      setSelectedPurchaseModal(null);
      setSelectedSaleModal(null);
      setSelectedExpenseModal(null);
      setShowPurchaseMenu(false);
      setShowSaleMenu(false);
      setShowExpenseMenu(false);
      
      setTimeout(() => {
        setSuccessMessage(null);
        onTransactionAdded?.();
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error recording transaction');
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
  const stockValue = 0; // Will be calculated from inventory
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

  const TransactionModal = ({
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
            <div className="font-semibold mb-2">📊 Accounting Impact:</div>
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
                {isExpenseType ? 'Description' : 'Item/Product Name'}
              </label>
              <input
                type="text"
                placeholder={
                  type === 'expense' ? 'e.g., Rent, Utilities, Maintenance' :
                  type === 'drawing' ? 'e.g., Cash withdrawal, Owner draw' :
                  isPurchaseType ? 'e.g., Rice, Flour, Soap' :
                  'e.g., Item sold'
                }
                autoComplete="off"
                autoFocus
                spellCheck="false"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-black focus:outline-none"
              />
            </div>

            {/* Quantity & Amount (NOT for expenses/drawings) */}
            {!isExpenseType ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (UGX)</label>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (UGX)</label>
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
                  {isPurchaseType ? 'Supplier Name' : 'Customer Name'}
                </label>
                <input
                  type="text"
                  placeholder={isPurchaseType ? 'e.g., ABC Suppliers' : 'e.g., Shoprite'}
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
          {successMessage && <p className="text-xs text-green-700 mb-3 bg-green-50 p-2 rounded">{successMessage}</p>}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit()}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Recording...' : buttonText}
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
          <div className="text-sm font-semibold text-gray-800">💵 Cash Purchase</div>
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
          <div className="text-sm font-semibold text-gray-800">💳 Credit Purchase</div>
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
          <div className="text-sm font-semibold text-gray-800">💵 Cash Sale</div>
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
          <div className="text-sm font-semibold text-gray-800">🤝 Credit Sale</div>
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
          <div className="text-sm font-semibold text-gray-800">💼 Business Expense</div>
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
          <div className="text-sm font-semibold text-gray-800">👤 Owner Drawing</div>
          <div className="text-xs text-gray-600">Cash ↓ Drawing ↑</div>
        </div>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-black to-gray-800 text-white p-6 rounded-xl">
        <h1 className="text-2xl font-bold">Double Entry Accounting Dashboard</h1>
        <p className="text-gray-300 text-sm mt-2">
          Click on any section to record transactions. All entries automatically update accounts.
        </p>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: PURCHASES & PAYABLES */}
        <div>
          <ColumnHeader
            title="PURCHASES & SUPPLIERS"
            description="What we buy on cash or credit"
          />

          <div className="space-y-3">
            {/* Total Purchases - Main Clickable */}
            <div className="relative">
              <AccountCard
                title="Total Purchases"
                value={`UGX ${totalPurchases.toLocaleString()}`}
                subtitle="💡 Click to record a purchase"
                icon={ShoppingCart}
                color="orange"
                onClick={() => setShowPurchaseMenu(!showPurchaseMenu)}
                isClickable={true}
              />
              {showPurchaseMenu && <PurchaseMenu />}
            </div>

            {/* Cash Purchases */}
            <AccountCard
              title="Purchases (Cash)"
              value={`UGX ${cashPurchases.toLocaleString()}`}
              subtitle="Cash decreased → Stock increased"
              icon={DollarSign}
              color="amber"
            />

            {/* Credit Purchases */}
            <AccountCard
              title="Purchases (Credit)"
              value={`UGX ${creditPurchases.toLocaleString()}`}
              subtitle="Creditors (Liability) increased"
              icon={AlertCircle}
              color="yellow"
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Creditors / Suppliers */}
            <AccountCard
              title="Creditors (Suppliers)"
              value={`UGX ${creditorsBalance.toLocaleString()}`}
              subtitle="Amount owed to suppliers"
              icon={Users}
              color="red"
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Expenses / Drawings - Clickable */}
            <div className="relative">
              <AccountCard
                title="Expenses (Drawings)"
                value={`UGX ${expenses.toLocaleString()}`}
                subtitle="💡 Click to record expense or drawing"
                icon={Wallet}
                color="rose"
                onClick={() => setShowExpenseMenu(!showExpenseMenu)}
                isClickable={true}
              />
              {showExpenseMenu && <ExpenseMenu />}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: ASSETS (CASH & STOCK) */}
        <div>
          <ColumnHeader
            title="ASSETS"
            description="What the business owns"
          />

          <div className="space-y-3">
            {/* Cash - Premium positioning */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border-2 border-green-400 shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-green-200">
                  <DollarSign className="w-5 h-5 text-green-700" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-600 mb-1">💰 CASH ON HAND</h3>
              <p className="text-3xl font-bold text-green-700">
                UGX {cashOnHand.toLocaleString()}
              </p>
              <div className="mt-3 text-xs text-gray-700 space-y-1 border-t border-green-300 pt-2">
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span className="font-semibold text-green-600">+UGX {cashSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Purchases:</span>
                  <span className="font-semibold text-red-600">-UGX {cashPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expenses:</span>
                  <span className="font-semibold text-red-600">-UGX {expenses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex justify-center py-3">
              <div className="text-center text-xs font-bold text-gray-400 uppercase">↕️ Movement</div>
            </div>

            {/* Stock/Inventory */}
            <AccountCard
              title="📦 Stock / Inventory"
              value={`UGX ${stockValue.toLocaleString()}`}
              subtitle="Physical inventory valuation"
              icon={Package}
              color="blue"
            />

            {/* Profit/Loss Summary */}
            <div
              className={`p-5 rounded-lg border-2 ${
                isProfit
                  ? 'border-green-400 bg-green-50'
                  : 'border-red-400 bg-red-50'
              }`}
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
                {isProfit ? '📈 NET PROFIT' : '📉 NET LOSS'}
              </h3>
              <p
                className={`text-2xl font-bold ${
                  isProfit ? 'text-green-700' : 'text-red-700'
                }`}
              >
                UGX {Math.abs(netPL).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Sales - Purchases - Expenses
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SALES & RECEIVABLES */}
        <div>
          <ColumnHeader
            title="SALES & CUSTOMERS"
            description="What we sell on cash or credit"
          />

          <div className="space-y-3">
            {/* Total Sales - Main Clickable */}
            <div className="relative">
              <AccountCard
                title="Total Sales"
                value={`UGX ${totalSales.toLocaleString()}`}
                subtitle="💡 Click to record a sale"
                icon={TrendingUp}
                color="green"
                onClick={() => setShowSaleMenu(!showSaleMenu)}
                isClickable={true}
              />
              {showSaleMenu && <SaleMenu />}
            </div>

            {/* Cash Sales */}
            <AccountCard
              title="Sales (Cash)"
              value={`UGX ${cashSales.toLocaleString()}`}
              subtitle="Cash increased → Stock decreased"
              icon={DollarSign}
              color="lime"
            />

            {/* Credit Sales */}
            <AccountCard
              title="Sales (Credit)"
              value={`UGX ${creditSales.toLocaleString()}`}
              subtitle="Debtors (Asset) increased"
              icon={CreditCard}
              color="cyan"
            />

            {/* Arrow */}
            <div className="flex justify-center py-2">
              <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
            </div>

            {/* Debtors / Customers */}
            <AccountCard
              title="Debtors (Customers)"
              value={`UGX ${debtorsBalance.toLocaleString()}`}
              subtitle="Amount owed by customers"
              icon={Users}
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Account Relationships Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-bold text-blue-900 mb-3">💼 PURCHASES → DEBIT</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>🛒 <strong>Cash Buy:</strong> Cash ↓ | Stock ↑</li>
            <li>💳 <strong>Credit Buy:</strong> Creditors ↑ | Stock ↑</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h3 className="font-bold text-green-900 mb-3">📊 SALES → CREDIT</h3>
          <ul className="text-sm text-green-800 space-y-2">
            <li>💵 <strong>Cash Sell:</strong> Cash ↑ | Stock ↓</li>
            <li>🤝 <strong>Credit Sell:</strong> Debtors ↑ | Stock ↓</li>
          </ul>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-5">
          <h3 className="font-bold text-rose-900 mb-3">💼 EXPENSES → DEBIT</h3>
          <ul className="text-sm text-rose-800 space-y-2">
            <li>🪧 <strong>Business:</strong> Expense ↑ | Cash ↓</li>
            <li>📋 Various operating costs</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
          <h3 className="font-bold text-purple-900 mb-3">🏦 DRAWINGS → DEBIT</h3>
          <ul className="text-sm text-purple-800 space-y-2">
            <li>💰 <strong>Withdrawal:</strong> Drawing ↑ | Cash ↓</li>
            <li>📌 Owner personal use</li>
          </ul>
        </div>
      </div>

      {/* Expression of Double Entry */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm font-mono text-gray-700">
          <span className="font-bold">Assets (Cash + Stock) = Liabilities (Creditors) + Equity (Profit - Drawings)</span>
        </p>
      </div>

      {/* Transaction Modals */}
      <TransactionModal
        isOpen={selectedPurchaseModal === 'cash'}
        title="💵 Record Cash Purchase"
        subtitle="When you buy items paying cash immediately"
        accountingExplain="Stock Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)"
        buttonText="Record Cash Purchase"
        type="cashPurchase"
        onSubmit={() => handleSubmitTransaction('cashPurchase')}
        onClose={() => setSelectedPurchaseModal(null)}
      />

      <TransactionModal
        isOpen={selectedPurchaseModal === 'credit'}
        title="💳 Record Credit Purchase"
        subtitle="When you buy items on credit from supplier"
        accountingExplain="Stock Account ↑ (DEBIT) | Creditors Account ↑ (CREDIT)"
        buttonText="Record Credit Purchase"
        type="creditPurchase"
        onSubmit={() => handleSubmitTransaction('creditPurchase')}
        onClose={() => setSelectedPurchaseModal(null)}
      />

      <TransactionModal
        isOpen={selectedSaleModal === 'cash'}
        title="💵 Record Cash Sale"
        subtitle="When you sell items and receive cash immediately"
        accountingExplain="Cash Account ↑ (DEBIT) | Sales/Stock Account ↓ (CREDIT)"
        buttonText="Record Cash Sale"
        type="cashSale"
        onSubmit={() => handleSubmitTransaction('cashSale')}
        onClose={() => setSelectedSaleModal(null)}
      />

      <TransactionModal
        isOpen={selectedSaleModal === 'credit'}
        title="🤝 Record Credit Sale"
        subtitle="When you sell items on credit to customer"
        accountingExplain="Debtors Account ↑ (DEBIT) | Sales Account ↑ (CREDIT)"
        buttonText="Record Credit Sale"
        type="creditSale"
        onSubmit={() => handleSubmitTransaction('creditSale')}
        onClose={() => setSelectedSaleModal(null)}
      />

      <TransactionModal
        isOpen={selectedExpenseModal === 'expense'}
        title="💼 Record Business Expense"
        subtitle="When the business incurs an operating expense"
        accountingExplain="Expense Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)"
        buttonText="Record Expense"
        type="expense"
        onSubmit={() => handleSubmitTransaction('expense')}
        onClose={() => setSelectedExpenseModal(null)}
      />

      <TransactionModal
        isOpen={selectedExpenseModal === 'drawing'}
        title="👤 Record Owner Drawing"
        subtitle="When the owner withdraws cash from the business"
        accountingExplain="Drawing Account ↑ (DEBIT) | Cash Account ↓ (CREDIT)"
        buttonText="Record Drawing"
        type="drawing"
        onSubmit={() => handleSubmitTransaction('drawing')}
        onClose={() => setSelectedExpenseModal(null)}
      />
    </div>
  );
}
