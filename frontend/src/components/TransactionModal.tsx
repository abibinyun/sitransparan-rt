import React, { useState } from 'react';
import { useCreateFinancialTransaction, useUploadProof } from '../services/financial';
import { TransactionType } from '../types/financial';
import { dateOnlyToISO } from '../utils/date';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const res = await uploadProof.mutateAsync(file);
      setProofUrl(res.proof_url);
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
        transaction_date: dateOnlyToISO(transactionDate)!,
        description: description || undefined,
        proof_url: proofUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mencatat transaksi kas');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Kas RT"
      description="Pencatatan kas pemasukan dan pengeluaran RT"
    >
      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Tipe Transaksi *</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`rounded-lg py-2 text-sm font-semibold border transition-all ${
                type === 'income'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pemasukan (Income)
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`rounded-lg py-2 text-sm font-semibold border transition-all ${
                type === 'expense'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pengeluaran (Expense)
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="txCategory">Kategori Transaksi *</Label>
          <Select
            id="txCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">-- Pilih Kategori --</option>
            {type === 'income' ? (
              <>
                <option value="IURAN_WARGA">Iuran Warga</option>
                <option value="DONASI">Donasi / Sumbangan</option>
                <option value="DANA_DESA">Dana Bantuan Desa/Pemerintah</option>
                <option value="LAINNYA_PEMASUKAN">Pemasukan Lain-lain</option>
              </>
            ) : (
              <>
                <option value="OPERASIONAL_RT">Operasional & Keamanan</option>
                <option value="KEBERSIHAN">Kebersihan & Sampah</option>
                <option value="KEGIATAN_WARGA">Kegiatan & Acara RT</option>
                <option value="PERBAIKAN_FASILITAS">Perbaikan Fasilitas</option>
                <option value="LAINNYA_PENGELUARAN">Pengeluaran Lain-lain</option>
              </>
            )}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="txAmount">Nominal (Rp) *</Label>
            <Input
              id="txAmount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="txDate">Tanggal *</Label>
            <Input
              id="txDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="txDesc">Keterangan (Opsional)</Label>
          <Textarea
            id="txDesc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Catatan tambahan transaksi..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="txProof">Bukti Kwitansi / Struk (Opsional)</Label>
          <Input
            id="txProof"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {proofUrl && <p className="text-xs text-emerald-600 font-medium">✓ Bukti ter-upload</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={createTx.isPending || uploading}>
            {createTx.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
