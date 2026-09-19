import React, { useState } from 'react';
import { 
  useHouses, 
  useCreateHouse, 
  useUpdateHouse, 
  useDeleteHouse, 
  useRegenerateHouseToken, 
  useResetHousePin,
  House 
} from '../services/house';
import { useResidents } from '../services/resident';
import { useAuthStore } from '../store/useAuthStore';
import { getTenantUrl } from '../utils/tenant';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import {
  QrCode,
  Home,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  Copy,
  Edit2,
  Trash2,
  Users,
  MessageCircle,
  KeyRound,
} from 'lucide-react';

export const HousesPage: React.FC = () => {
  const { activeTenant, user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [isPrintStickerModalOpen, setIsPrintStickerModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form states
  const [blockNumber, setBlockNumber] = useState('');
  const [address, setAddress] = useState('');
  const [headResidentId, setHeadResidentId] = useState('');

  const { data, isLoading } = useHouses({ limit: 100 });
  const { data: residentsData } = useResidents({ limit: 100 });
  const createMutation = useCreateHouse();
  const updateMutation = useUpdateHouse();
  const deleteMutation = useDeleteHouse();
  const regenerateMutation = useRegenerateHouseToken();
  const resetPinMutation = useResetHousePin();

  const houses = data?.data || [];
  const residents = residentsData?.data || [];

  const tenantSlug = activeTenant?.slug || 'sitransparan-rt';

  const filteredHouses = houses.filter((h) => {
    const matchBlock = h.block_number.toLowerCase().includes(search.toLowerCase());
    const matchAddress = (h.address || '').toLowerCase().includes(search.toLowerCase());
    const matchHead = (h.head_resident?.full_name || '').toLowerCase().includes(search.toLowerCase());
    return matchBlock || matchAddress || matchHead;
  });

  const openCreateModal = () => {
    setEditingHouse(null);
    setBlockNumber('');
    setAddress('');
    setHeadResidentId('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (house: House) => {
    setEditingHouse(house);
    setBlockNumber(house.block_number);
    setAddress(house.address || '');
    setHeadResidentId(house.head_resident_id || '');
    setIsCreateModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockNumber.trim()) return;

    if (editingHouse) {
      await updateMutation.mutateAsync({
        id: editingHouse.id,
        block_number: blockNumber.trim(),
        address: address.trim() || undefined,
        head_resident_id: headResidentId || undefined,
      });
    } else {
      await createMutation.mutateAsync({
        block_number: blockNumber.trim(),
        address: address.trim() || undefined,
        head_resident_id: headResidentId || undefined,
      });
    }

    setBlockNumber('');
    setAddress('');
    setHeadResidentId('');
    setEditingHouse(null);
    setIsCreateModalOpen(false);
  };

  const handleDelete = async (house: House) => {
    if (!window.confirm(`Hapus data rumah Blok/No "${house.block_number}"? Data token dan histori QR akan terhapus.`)) {
      return;
    }
    await deleteMutation.mutateAsync(house.id);
  };

  const handleRegenerate = async (house: House) => {
    if (!window.confirm(`Reset QR Token untuk Blok/No ${house.block_number}? Stiker QR lama tidak akan bisa digunakan lagi dan sesi aktif akan terputus.`)) {
      return;
    }
    await regenerateMutation.mutateAsync(house.id);
  };

  const handleResetPin = async (house: House) => {
    if (!window.confirm(`Reset PIN 4 Digit untuk Blok/No ${house.block_number}? PIN baru akan di-generate otomatis.`)) {
      return;
    }
    await resetPinMutation.mutateAsync(house.id);
  };

  const copyClaimUrl = (token: string) => {
    const url = getTenantUrl(tenantSlug, `/claim?token=${token}`);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getWhatsAppShareUrl = (house: House) => {
    const claimUrl = getTenantUrl(tenantSlug, `/claim?token=${house.access_token}`);
    const headName = house.head_resident?.full_name ? `Bapak/Ibu ${house.head_resident.full_name}` : 'Bapak/Ibu';
    const pinText = house.pin_code ? `\n🔑 PIN Verifikasi Rumah Anda: *${house.pin_code}* (simpan baik-baik)\n` : '';
    const message = encodeURIComponent(
      `Halo ${headName},\n\nBerikut tautan resmi Portal Transparansi RT untuk rumah ${house.block_number}.${pinText}\nCukup klik tautan ini untuk langsung membuka kas RT, agenda kegiatan, dan ikut musyawarah warga tanpa perlu kata sandi:\n👉 ${claimUrl}\n\nSalam hormat,\nPengurus RT`
    );
    let phone = (house.head_resident?.phone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    return phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const getQRImageUrl = (token: string) => {
    const targetUrl = encodeURIComponent(getTenantUrl(tenantSlug, `/claim?token=${token}`));
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${targetUrl}&margin=10`;
  };

  const handlePrint = () => {
    window.print();
  };

  const demographyTabs = [
    { to: '/admin/residents', label: 'Data Warga & KK', icon: Users },
    { to: '/admin/houses', label: 'Stiker QR Rumah (1 Rumah 1 Token)', icon: QrCode },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Kependudukan & Wilayah"
        description="Kelola data induk kependudukan warga, kartu keluarga, dan penomoran stiker rumah."
        tabs={demographyTabs}
        actions={
          !isResident ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsPrintStickerModalOpen(true)}
                className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Printer className="w-4 h-4" />
                Cetak Lembar Stiker
              </Button>
              <Button
                onClick={openCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Rumah
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Info Card */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg mt-0.5">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-900">Cara Kerja Stiker QR Rumah:</h2>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              Cetak dan tempelkan QR stiker di pintu rumah warga. Ketika warga memindai (scan) QR lewat kamera ponsel, warga langsung otomatis masuk sebagai pemilih resmi di polling musyawarah dan penyampai aspirasi tanpa registrasi ribet.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari Blok / Alamat / Kepala Keluarga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Terdaftar: <strong className="text-slate-800">{houses.length}</strong> Rumah
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Preview QR</TableHead>
                <TableHead>Blok / No. Rumah</TableHead>
                <TableHead>Alamat Lengkap</TableHead>
                <TableHead>Kepala Keluarga Terkait</TableHead>
                <TableHead>PIN Stiker</TableHead>
                <TableHead>Status Token</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Memuat data rumah warga...
                  </TableCell>
                </TableRow>
              ) : filteredHouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Belum ada data rumah terdaftar. Klik tombol <strong>Tambah Rumah</strong> di atas.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHouses.map((house) => {
                  const claimUrl = getTenantUrl(tenantSlug, `/claim?token=${house.access_token}`);
                  const qrUrl = getQRImageUrl(house.access_token);

                  return (
                    <TableRow key={house.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded p-1 flex items-center justify-center shadow-xs">
                          <img
                            src={qrUrl}
                            alt={`QR ${house.block_number}`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {house.block_number}
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs">
                        {house.address || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {house.head_resident ? (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {house.head_resident.full_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditautkan</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200">
                            {house.pin_code || '----'}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetPin(house)}
                            disabled={resetPinMutation.isPending}
                            title="Reset PIN 4 Digit"
                            className="text-slate-400 hover:text-amber-600 p-1 h-6 w-6"
                          >
                            <KeyRound className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            house.token_status === 'active'
                              ? 'success'
                              : house.token_status === 'revoked'
                              ? 'destructive'
                              : 'warning'
                          }
                        >
                          {house.token_status === 'active' ? 'Aktif' : house.token_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyClaimUrl(house.access_token)}
                            title="Salin Tautan Akses Warga"
                            className="text-slate-600 hover:text-emerald-600 text-xs p-2 h-8"
                          >
                            {copiedToken === house.access_token ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Tersalin
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <a
                            href={getWhatsAppShareUrl(house)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8"
                            title={house.head_resident?.phone ? `Kirim ke WhatsApp (${house.head_resident.phone})` : 'Kirim ke WhatsApp Warga'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={claimUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 h-8 w-8"
                            title="Uji Langsung Akses Warga"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {!isResident && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(house)}
                                title="Edit Rumah"
                                className="text-slate-500 hover:text-indigo-600 p-2 h-8 w-8"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRegenerate(house)}
                                disabled={regenerateMutation.isPending}
                                title="Generate Ulang Token (Reset QR)"
                                className="text-slate-500 hover:text-amber-600 p-2 h-8 w-8"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(house)}
                                disabled={deleteMutation.isPending}
                                title="Hapus Rumah"
                                className="text-slate-500 hover:text-rose-600 p-2 h-8 w-8"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Tambah / Edit Rumah */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl sm:max-w-3xl w-full p-5 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-600" />
                {editingHouse ? 'Edit Data Rumah' : 'Daftarkan Rumah Baru'}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingHouse(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atas Nama <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Contoh: Bpk. Bambang Pamungkas / Blok A1 No. 05"
                  value={blockNumber}
                  onChange={(e) => setBlockNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat / Keterangan Lokasi
                </label>
                <Input
                  placeholder="Contoh: Jl. Melati Raya RT 05"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tautkan Kepala Keluarga (Opsional)
                </label>
                <Select
                  value={headResidentId}
                  onValueChange={(val) => setHeadResidentId(val)}
                >
                  <option value="">-- Belum Ditautkan --</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.nik})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingHouse(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Menyimpan...' 
                    : editingHouse 
                    ? 'Simpan Perubahan' 
                    : 'Simpan & Buat QR'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Lembar Stiker QR */}
      {isPrintStickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:p-0 print:static print:bg-transparent">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 print:max-h-none print:shadow-none print:p-0 print:overflow-visible">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Pratinjau Lembar Cetak Stiker QR
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Siap dicetak pada kertas stiker HVS / Vinyl ukuran A4 untuk ditempel di pintu warga.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Sekarang (Print)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPrintStickerModalOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>

            {/* Print Grid Stiker */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-4">
              {filteredHouses.map((h) => {
                const qrUrl = getQRImageUrl(h.access_token);
                return (
                  <div
                    key={h.id}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-between text-center bg-white shadow-xs print:border-solid print:border-slate-800 print:break-inside-avoid"
                  >
                    <div className="w-full border-b pb-2 mb-2">
                      <div className="text-[10px] font-extrabold tracking-wider uppercase text-emerald-700">
                        {activeTenant?.name || 'SITRANSPARAN RT'}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        STIKER AKSES WARGA
                      </div>
                    </div>

                    <div className="my-2 p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                      <img
                        src={qrUrl}
                        alt={`QR ${h.block_number}`}
                        className="w-36 h-36 object-contain"
                      />
                    </div>

                    <div className="w-full mt-2 pt-2 border-t border-slate-100">
                      <div className="text-base font-black text-slate-900">
                        {h.block_number}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-full">
                        {h.head_resident ? h.head_resident.full_name : h.address || 'Warga RT'}
                      </div>
                      {h.pin_code && (
                        <div className="mt-1.5 flex items-center justify-center gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">PIN:</span>
                          <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            {h.pin_code}
                          </span>
                        </div>
                      )}
                      <div className="mt-1.5 text-[9px] text-emerald-800 font-semibold bg-emerald-50 py-0.5 rounded">
                        Scan untuk Musyawarah & Usulan
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
