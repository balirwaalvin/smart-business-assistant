'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLang } from '@/contexts/LangContext';

type InventoryItem = {
  id: number;
  product: string;
  quantity: number;
  price: number;
  cost_price: number;
  low_stock_threshold: number;
};

export default function InventoryManager({ onInventoryChanged }: { onInventoryChanged: () => void }) {
  const { t } = useLang();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      const data = await response.json();
      setItems(data);
    } catch (fetchError) {
      console.error(fetchError);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          quantity,
          price,
          cost_price: costPrice,
          low_stock_threshold: lowStockThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save inventory item');
      }

      setProduct('');
      setQuantity(0);
      setPrice(0);
      setCostPrice(0);
      setLowStockThreshold(5);

      await fetchItems();
      onInventoryChanged();
    } catch (saveError) {
      console.error(saveError);
      setError(t('inventorySaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-bold mb-4 text-black">{t('stockManagerTitle')}</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">{t('stockProductLabel')}</label>
        <input
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder={t('stockProductPlaceholder')}
          className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500"
          required
        />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('stockQuantityLabel')}</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            placeholder={t('stockQuantityPlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500"
            min={0}
          />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('stockSellingPriceLabel')}</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            placeholder={t('stockSellingPricePlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500"
            min={0}
          />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('stockCostPriceLabel')}</label>
          <input
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(Number(e.target.value) || 0)}
            placeholder={t('stockCostPricePlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500"
            min={0}
          />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t('stockThresholdLabel')}</label>
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Number(e.target.value) || 0)}
            placeholder={t('stockThresholdPlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-500"
            min={0}
          />
          </div>
        </div>

        {error && <p className="text-xs text-violet-700">{error}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-black text-white py-2.5 rounded-md text-sm font-semibold hover:bg-gray-800 disabled:opacity-60"
        >
          {isSaving ? t('stockSavingButton') : t('stockSaveButton')}
        </button>
      </form>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">{t('stockItemsLabel')}</p>
        {items.length === 0 ? (
          <p className="text-xs text-gray-500">{t('stockNoItems')}</p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-auto pr-1">
            {items.map((item) => (
              <li key={item.id} className="text-xs text-gray-700 flex justify-between">
                <span className="font-medium capitalize">{item.product}</span>
                <span>
                  {item.quantity} | UGX {item.price.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
