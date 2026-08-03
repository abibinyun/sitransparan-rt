import React, { useState } from 'react';
import { useCreateFinancialTransaction, useUploadProof } from '../services/financial';
import { TransactionType } from '../types/financial';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose }) => {
  const createTx = useCreateFinancialTransaction();
  const uploadProof = useUploadProof();

  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const res = await uploadProof.mutateAsync(file);
      setProofUrl(res.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengunggah bukti transaksi');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || amount <= 0 || !transactionDate) {
      setError('Harap isi semua bidang wajib');
      return;
    }

    try {
      setError('');
      await createTx.mutateAsync({
        type,
        category,
        amount: Number(amount),
        transaction_date: transactionDate,
        description: description || undefined,
        proof_url: proofUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mencatat transaksi kas');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Catat Transaksi Kas RT</h3>
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipe Transaksi *</label>
            <div className="mt-1 flex space-x-4">
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={type === 'income'}
                  onChange={() => setType('income')}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 font-medium text-green-700">Pemasukan (Income)</span>
              </label>
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={() => setType('expense')}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="ml-2 font-medium text-red-700">Pengeluaran (Expense)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori / Keterangan Singkat *</label>
            <input
              type="text"
              placeholder="misal: Sumbangan Acara, Perbaikan Jalan"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
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
            <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi *</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Deskripsi / Catatan Tambahan</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bukti Nota / Transfer (Upload File)</label>
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
              disabled={createTx.isPending || uploading}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createTx.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
