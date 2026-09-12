import React, { useState } from 'react';
import { useFeeCategories, useCreateFinancialTransaction, useUploadProof, useFunds } from '../services/financial';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';
import { dateOnlyToISO } from '../utils/date';

interface DuesDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFeeCategoryId?: string;
  categoryBalances?: Record<string, { collected: number; spent: number; balance: number }>;
}

export const DuesDisbursementModal: React.FC<DuesDisbursementModalProps> = ({
  isOpen,
  onClose,
  defaultFeeCategoryId = '',
  categoryBalances = {},
}) => {
  const { data: rawCats = [] } = useFeeCategories();
  const categories = Array.isArray(rawCats) ? rawCats : (rawCats as any)?.data || [];
  const { data: rawFunds } = useFunds();
  const funds = Array.isArray(rawFunds) ? rawFunds : (rawFunds as any)?.data || [];

  const createTx = useCreateFinancialTransaction();
  const uploadProof = useUploadProof();

  const [feeCategoryId, setFeeCategoryId] = useState<string>(defaultFeeCategoryId);
  const [targetType, setTargetType] = useState<'fund' | 'external'>('fund');
  const [targetFundId, setTargetFundId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (defaultFeeCategoryId) {
      setFeeCategoryId(defaultFeeCategoryId);
    } else if (categories.length > 0 && !feeCategoryId) {
      setFeeCategoryId(categories[0].id);
    }
  }, [defaultFeeCategoryId, categories]);

  const selectedCat = categories.find((c: any) => c.id === feeCategoryId);
  const selectedBalance = selectedCat ? (categoryBalances[selectedCat.id]?.balance ?? 0) : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const res = await uploadProof.mutateAsync(file);
      setProofUrl(res.proof_url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengunggah bukti pengeluaran');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeCategoryId || amount <= 0 || !transactionDate) {
      setError('Harap pilih pos iuran dan tentukan nominal yang valid');
      return;
    }

    if (amount > selectedBalance) {
      setError(`Saldo pos iuran tidak mencukupi (Tersedia: Rp ${selectedBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(amount).toLocaleString('id-ID')})`);
      return;
    }

    const catName = selectedCat ? selectedCat.name : 'IURAN';

    try {
      setError('');
      if (targetType === 'fund') {
        // Perpindahan dana dari Iuran ke Kantong Kas tujuan
        // Jika targetFundId kosong, pilih kantong kas default
        const defaultFund = funds.find((f: any) => f.is_default) || funds[0];
        const chosenFundId = targetFundId || defaultFund?.id;
        const targetFund = funds.find((f: any) => f.id === chosenFundId);
        const fundNameLabel = targetFund ? targetFund.name : 'Kas Utama RT';

        // Mutasi masuk ke kantong kas tujuan dari pos iuran (ini memindahkan uang masuk ke fund)
        await createTx.mutateAsync({
          type: 'income',
          fund_id: chosenFundId || undefined,
          category: `IURAN_PINDAH_KAS: ${catName}`,
          amount: Number(amount),
          transaction_date: dateOnlyToISO(transactionDate)!,
          description: `Penyaluran dari Iuran ${catName} ke ${fundNameLabel}${description ? ` - ${description}` : ''}`,
          proof_url: proofUrl || undefined,
        });
      } else {
        // Pengeluaran belanja langsung ke vendor pihak ketiga
        await createTx.mutateAsync({
          type: 'expense',
          category: `IURAN_KELUAR: ${catName}`,
          amount: Number(amount),
          transaction_date: dateOnlyToISO(transactionDate)!,
          description: description ? `[Iuran ${catName}] ${description}` : `Pengeluaran langsung pos iuran ${catName}`,
          proof_url: proofUrl || undefined,
        });
      }

      onClose();
      // Reset form
      setAmount(0);
      setDescription('');
      setProofUrl('');
      setTargetFundId('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Gagal memproses penyaluran dana iuran');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Salurkan / Keluarkan Dana Iuran"
      description="Penggunaan dana dari pos iuran warga (ke kantong kas atau langsung ke belanja/vendor)"
      className="max-w-3xl"
      preventOutsideClose={true}
    >
      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilih Pos Iuran Sumber */}
        <div className="space-y-1.5">
          <Label htmlFor="disburseCat">Pos Iuran Sumber *</Label>
          <Select
            id="disburseCat"
            value={feeCategoryId}
            onChange={(e) => setFeeCategoryId(e.target.value)}
            required
          >
            <option value="">-- Pilih Pos Iuran --</option>
            {categories.map((c: any) => {
              const b = categoryBalances[c.id]?.balance ?? 0;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} (Tersedia: Rp {b.toLocaleString('id-ID')})
                </option>
              );
            })}
          </Select>
          {selectedCat && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center text-emerald-900">
              <span>Sisa Saldo Dana Tersedia:</span>
              <strong className="text-sm">Rp {selectedBalance.toLocaleString('id-ID')}</strong>
            </div>
          )}
        </div>

        {/* Tipe Tujuan Penyaluran */}
        <div className="space-y-1.5">
          <Label>Tujuan Penyaluran / Pengeluaran *</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetType('fund')}
              className={`p-2.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                targetType === 'fund'
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold">Ke Kantong Kas RT</div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5">Pindahkan dana ke kantong operasional</div>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('external')}
              className={`p-2.5 text-xs font-semibold rounded-lg border text-left transition-all ${
                targetType === 'external'
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold">Belanja Langsung</div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5">Bayar vendor sampah, ronda, perbaikan</div>
            </button>
          </div>
        </div>

        {/* Target Kantong Kas jika dipilih 'fund' */}
        {targetType === 'fund' && (
          <div className="space-y-1.5">
            <Label htmlFor="targetFund">Pilih Kantong Kas Tujuan *</Label>
            <Select
              id="targetFund"
              value={targetFundId}
              onChange={(e) => setTargetFundId(e.target.value)}
              required
            >
              <option value="">-- Pilih Kantong Kas Tujuan --</option>
              {funds.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.is_default ? '(Kantong Utama)' : ''}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Nominal */}
        <div className="space-y-1.5">
          <Label htmlFor="disburseAmount">Nominal yang Dikeluarkan (Rp) *</Label>
          <Input
            id="disburseAmount"
            type="number"
            min="1"
            max={selectedBalance > 0 ? selectedBalance : undefined}
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Contoh: 150000"
            required
          />
          {selectedBalance > 0 && amount > selectedBalance && (
            <p className="text-[11px] text-amber-600 font-medium">
              ⚠️ Perhatian: Nominal melebihi saldo dana yang tersedia di pos ini.
            </p>
          )}
        </div>

        {/* Tanggal */}
        <div className="space-y-1.5">
          <Label htmlFor="disburseDate">Tanggal Transaksi *</Label>
          <Input
            id="disburseDate"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>

        {/* Keterangan */}
        <div className="space-y-1.5">
          <Label htmlFor="disburseDesc">Keterangan / Keperluan</Label>
          <Textarea
            id="disburseDesc"
            rows={2}
            placeholder="Contoh: Pembayaran truk angkut sampah bulan ini / Gaji pos satpam"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Bukti Dokumen / Nota */}
        <div className="space-y-1.5">
          <Label htmlFor="disburseProof">Bukti Nota / Kwitansi (Opsional)</Label>
          <Input
            id="disburseProof"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {proofUrl && <p className="text-xs text-emerald-600 font-medium">✓ Bukti kwitansi berhasil diunggah</p>}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={createTx.isPending || uploading} className="bg-rose-600 hover:bg-rose-700 text-white">
            {createTx.isPending ? 'Memproses...' : 'Keluarkan / Salurkan Dana'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};