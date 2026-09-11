import React, { useState } from 'react';
import { useCreateFinancialTransaction, useUploadProof, useFunds } from '../services/financial';
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
  const { data: rawFunds } = useFunds();
  const funds = Array.isArray(rawFunds) ? rawFunds : (rawFunds as any)?.data || [];

  const [type, setType] = useState<TransactionType>('income');
  const [fundId, setFundId] = useState<string>('');

  // Auto-select default fund saat modal dibuka atau list kantong kas siap
  React.useEffect(() => {
    if (isOpen && funds.length > 0 && !fundId) {
      const defaultFund = funds.find((f: any) => f.is_default) || funds[0];
      if (defaultFund) {
        setFundId(defaultFund.id);
      }
    }
  }, [isOpen, funds, fundId]);

  const [category, setCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [customOptions, setCustomOptions] = useState<{ id: string; name: string; type: 'income' | 'expense' }[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('sitransparan_custom_cash_categories');
      if (saved) {
        setCustomOptions(JSON.parse(saved));
      } else {
        setCustomOptions([
          { id: 'cat_in_1', name: 'IURAN_WARGA', type: 'income' },
          { id: 'cat_in_2', name: 'DONASI', type: 'income' },
          { id: 'cat_in_3', name: 'DANA_DESA', type: 'income' },
          { id: 'cat_in_4', name: 'LAINNYA_PEMASUKAN', type: 'income' },
          { id: 'cat_out_1', name: 'OPERASIONAL_RT', type: 'expense' },
          { id: 'cat_out_2', name: 'KEBERSIHAN', type: 'expense' },
          { id: 'cat_out_3', name: 'KEGIATAN_WARGA', type: 'expense' },
          { id: 'cat_out_4', name: 'PERBAIKAN_FASILITAS', type: 'expense' },
          { id: 'cat_out_5', name: 'LAINNYA_PENGELUARAN', type: 'expense' },
        ]);
      }
    } catch {}
  }, [isOpen]);
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

  const selectedFund = funds.find((f: any) => f.id === fundId) || funds.find((f: any) => f.is_default) || funds[0];
  const fundBalance = selectedFund?.balance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategory.trim() : category;
    if (!finalCategory || amount <= 0 || !transactionDate) {
      setError('Harap isi semua bidang wajib');
      return;
    }

    // Pastikan jika transaksi pengeluaran (expense), saldo kantong kas mencukupi
    if (type === 'expense' && amount > fundBalance) {
      setError(`Saldo kantong kas "${selectedFund?.name || 'Kas'}" tidak mencukupi (Tersedia: Rp ${fundBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(amount).toLocaleString('id-ID')})`);
      return;
    }

    // Resolusikan fund_id: jika belum dipilih atau string kosong, gunakan id kantong kas default
    const resolvedFundId = fundId || selectedFund?.id;

    try {
      setError('');
      await createTx.mutateAsync({
        type,
        fund_id: resolvedFundId || undefined,
        category: finalCategory,
        amount: Number(amount),
        transaction_date: dateOnlyToISO(transactionDate)!,
        description: description || undefined,
        proof_url: proofUrl || undefined,
      });
      onClose();
      // Reset form
      setCategory('');
      setIsCustomCategory(false);
      setCustomCategory('');
      setFundId('');
      setAmount(0);
      setDescription('');
      setProofUrl('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Gagal mencatat transaksi kas');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Transaksi Kas RT"
      description="Pencatatan kas pemasukan dan pengeluaran RT"
      className="max-w-xl sm:max-w-2xl"
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
          <div className="flex justify-between items-center">
            <Label htmlFor="txFund">Kantong Kas (Fund) *</Label>
            {selectedFund && (
              <span className="text-[11px] text-slate-500 font-medium">
                Saldo: <strong className="text-slate-800">Rp {(selectedFund.balance ?? 0).toLocaleString('id-ID')}</strong>
              </span>
            )}
          </div>
          <Select
            id="txFund"
            value={fundId}
            onChange={(e) => setFundId(e.target.value)}
          >
            <option value="">-- Default ({funds.find((f: any) => f.is_default)?.name || 'Kas Utama RT'}) --</option>
            {funds.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.is_default ? '(Utama)' : ''} - Saldo Rp {(f.balance ?? 0).toLocaleString('id-ID')}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="txCategory">Kategori Transaksi *</Label>
          {!isCustomCategory ? (
            <div className="space-y-2">
              <Select
                id="txCategory"
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomCategory(true);
                    setCategory('');
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                required
              >
                <option value="">-- Pilih Kategori --</option>
                {type === 'income' ? (
                  <>
                    <optgroup label="Pos Pemasukan Kas RT">
                      {customOptions.filter((c) => c.type === 'income').map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="Pos Pengeluaran Kas RT">
                      {customOptions.filter((c) => c.type === 'expense').map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </optgroup>
                  </>
                )}
                <option value="__CUSTOM__">+ Buat Kategori Kustom / Baru...</option>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  id="customCategory"
                  type="text"
                  placeholder="Ketik nama kategori (misal: POSYANDU, JIMPITAN)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustomCategory(false);
                    setCustomCategory('');
                  }}
                >
                  Pilih List
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="txAmount">Nominal (Rp) *</Label>
            <Input
              id="txAmount"
              type="number"
              min="1"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
            {type === 'expense' && amount > fundBalance && (
              <p className="text-[11px] text-rose-600 font-medium">
                ⚠️ Saldo tidak mencukupi (Tersedia: Rp {fundBalance.toLocaleString('id-ID')})
              </p>
            )}
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
