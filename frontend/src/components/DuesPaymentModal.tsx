import React, { useState } from 'react';
import { useFeeCategories, useCreateDuesPayment, useUploadProof } from '../services/financial';
import { useResidents } from '../services/resident';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';

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

  const handleCategoryChange = (catId: string) => {
    setFeeCategoryId(catId);
    const cat = categories.find((c: any) => c.id === catId);
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catat / Bayar Iuran Warga"
      description="Pencatatan transaksi iuran warga perumahan/RT"
    >
      {error && <div className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="duesResident">Warga *</Label>
          <Select
            id="duesResident"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            required
          >
            <option value="">-- Pilih Warga --</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name} ({r.nik})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duesCategory">Kategori Iuran *</Label>
          <Select
            id="duesCategory"
            value={feeCategoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
          >
            <option value="">-- Pilih Kategori --</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} (Rp {c.amount.toLocaleString('id-ID')})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duesMonth">Bulan *</Label>
            <Select
              id="duesMonth"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duesYear">Tahun *</Label>
            <Input
              id="duesYear"
              type="number"
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duesAmount">Nominal (Rp) *</Label>
          <Input
            id="duesAmount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proofFile">Bukti Transfer / Pembayaran</Label>
          <Input
            id="proofFile"
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
          <Button type="submit" disabled={createPayment.isPending || uploading}>
            {createPayment.isPending ? 'Menyimpan...' : 'Simpan Iuran'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
