import React, { useState } from 'react';
import { useFeeCategories, useCreateDuesPayment, useUploadProof } from '../services/financial';
import { useResidents } from '../services/resident';

interface DuesPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DuesPaymentModal: React.FC<DuesPaymentModalProps> = ({ isOpen, onClose }) => {
  const { data: categories = [] } = useFeeCategories();
  const { data: residentList } = useResidents({ limit: 100 });
  const residents = Array.isArray(residentList) ? residentList : residentList?.data || [];

  const createPayment = useCreateDuesPayment();
  const uploadProof = useUploadProof();

  const [residentId, setResidentId] = useState('');
  const [feeCategoryId, setFeeCategoryId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCategoryChange = (catId: string) => {
    setFeeCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setAmount(cat.amount);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const res = await uploadProof.mutateAsync(file);
      setProofUrl(res.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengunggah bukti transfer');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentId || !feeCategoryId || amount <= 0) {
      setError('Harap isi semua bidang wajib');
      return;
    }

    try {
      setError('');
      await createPayment.mutateAsync({
        resident_id: residentId,
        fee_category_id: feeCategoryId,
        amount: Number(amount),
        period_month: Number(periodMonth),
        period_year: Number(periodYear),
        proof_url: proofUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mencatat iuran warga');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Catat / Bayar Iuran Warga</h3>
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Warga *</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- Pilih Warga --</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name} ({r.nik})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori Iuran *</label>
            <select
              value={feeCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Rp {c.amount.toLocaleString('id-ID')} ({c.period})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bulan *</label>
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Bulan {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tahun *</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Jumlah (Rp) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bukti Transfer (Upload File)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploading && <p className="mt-1 text-xs text-gray-500">Mengunggah bukti...</p>}
            {proofUrl && (
              <p className="mt-1 text-xs text-green-600 font-medium truncate">
                Bukti terunggah: {proofUrl}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createPayment.isPending || uploading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createPayment.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
