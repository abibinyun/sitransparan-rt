import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Plus,
  Trash2,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import {
  useWasteCollectors,
  useCreateWasteCollector,
  useUpdateWasteCollector,
  useDeleteWasteCollector,
  useWasteAttendance,
  useCreateWasteAttendance,
  useDeleteWasteAttendance,
  WasteCollector,
} from '../services/waste_attendance';
import { useResidents } from '../services/resident';
import { SearchableResidentSelect } from './ui/SearchableResidentSelect';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SimpleDialog } from './ui/dialog';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const WAGE_PER_PERSON_DEFAULT = 5000;

export const WasteAttendanceTab: React.FC<{ isResident: boolean }> = ({ isResident }) => {
  const [subTab, setSubTab] = useState<'attendance' | 'collectors'>('attendance');

  // Queries
  const { data: collectorsData, isLoading: loadingCollectors } = useWasteCollectors();
  const { data: attendanceData, isLoading: loadingAttendance } = useWasteAttendance();
  const { data: residentsData } = useResidents();

  // Mutations
  const createCollector = useCreateWasteCollector();
  const updateCollector = useUpdateWasteCollector();
  const deleteCollector = useDeleteWasteCollector();
  const createAttendance = useCreateWasteAttendance();
  const deleteAttendance = useDeleteWasteAttendance();

  // Modals state
  const [isCollectorModalOpen, setIsCollectorModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState<WasteCollector | null>(null);
  const [collectorForm, setCollectorForm] = useState({
    resident_id: '',
    name: '',
    phone: '',
    is_active: true,
  });

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    collector_ids: [] as string[],
    wage_per_person: WAGE_PER_PERSON_DEFAULT,
    notes: '',
  });

  const collectors = collectorsData?.data || [];
  const attendances = attendanceData?.data || [];
  const residents = residentsData?.data || [];

  // Hitung total honor yang telah dibayarkan
  const totalHonorPaid = attendances.reduce((acc, curr) => acc + (curr.total_wage || 0), 0);

  // Handlers Collector
  const handleOpenAddCollector = () => {
    setEditingCollector(null);
    setCollectorForm({ resident_id: '', name: '', phone: '', is_active: true });
    setIsCollectorModalOpen(true);
  };

  const handleOpenEditCollector = (c: WasteCollector) => {
    setEditingCollector(c);
    setCollectorForm({
      resident_id: c.resident_id || '',
      name: c.name,
      phone: c.phone || '',
      is_active: c.is_active,
    });
    setIsCollectorModalOpen(true);
  };

  const handleSaveCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectorForm.name.trim()) {
      alert('Nama petugas wajib diisi');
      return;
    }

    try {
      if (editingCollector) {
        await updateCollector.mutateAsync({
          id: editingCollector.id,
          payload: {
            resident_id: collectorForm.resident_id || undefined,
            name: collectorForm.name.trim(),
            phone: collectorForm.phone.trim() || undefined,
            is_active: collectorForm.is_active,
          },
        });
      } else {
        await createCollector.mutateAsync({
          resident_id: collectorForm.resident_id || undefined,
          name: collectorForm.name.trim(),
          phone: collectorForm.phone.trim() || undefined,
        });
      }
      setIsCollectorModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal menyimpan petugas');
    }
  };

  const handleDeleteCollector = async (id: string, name: string) => {
    if (!confirm(`Hapus petugas "${name}" dari daftar?`)) return;
    try {
      await deleteCollector.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal menghapus petugas');
    }
  };

  // Handlers Attendance
  const handleOpenAttendanceModal = () => {
    setAttendanceForm({
      date: new Date().toISOString().split('T')[0],
      collector_ids: [],
      wage_per_person: WAGE_PER_PERSON_DEFAULT,
      notes: '',
    });
    setIsAttendanceModalOpen(true);
  };

  const toggleCollectorSelection = (id: string) => {
    setAttendanceForm((prev) => {
      const exists = prev.collector_ids.includes(id);
      return {
        ...prev,
        collector_ids: exists
          ? prev.collector_ids.filter((cid) => cid !== id)
          : [...prev.collector_ids, id],
      };
    });
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.date) {
      alert('Tanggal tugas penarikan wajib diisi');
      return;
    }
    if (attendanceForm.collector_ids.length === 0) {
      alert('Pilih minimal 1 petugas sampah yang bertugas');
      return;
    }

    try {
      await createAttendance.mutateAsync({
        date: attendanceForm.date,
        collector_ids: attendanceForm.collector_ids,
        wage_per_person: attendanceForm.wage_per_person,
        notes: attendanceForm.notes.trim() || undefined,
      });
      setIsAttendanceModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal mencatat absensi');
    }
  };

  const handleDeleteAttendance = async (id: string, date: string) => {
    if (!confirm(`Hapus catatan absensi tanggal ${date}?`)) return;
    try {
      await deleteAttendance.mutateAsync(id);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Gagal menghapus absensi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-[#d2d2d7] shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#0071e3] rounded-xl border border-blue-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider">Total Petugas Pemuda</p>
            <h3 className="text-xl font-bold text-[#1d1d1f]">{collectors.length} Orang</h3>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#d2d2d7] shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider">Sesi Penarikan Sampah</p>
            <h3 className="text-xl font-bold text-[#1d1d1f]">{attendances.length} Kali Tugas</h3>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#d2d2d7] shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider">Total Honor Dikeluarkan</p>
            <h3 className="text-xl font-bold text-[#1d1d1f]">
              Rp {totalHonorPaid.toLocaleString('id-ID')}
            </h3>
          </div>
        </Card>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-[#d2d2d7]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('attendance')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'attendance'
                ? 'bg-[#1d1d1f] text-white shadow-xs'
                : 'text-[#707070] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
            }`}
          >
            Rekap Absensi & Honor ({attendances.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('collectors')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              subTab === 'collectors'
                ? 'bg-[#1d1d1f] text-white shadow-xs'
                : 'text-[#707070] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
            }`}
          >
            Daftar Petugas Sampah ({collectors.length})
          </button>
        </div>

        {!isResident && (
          <div className="flex items-center gap-2">
            {subTab === 'attendance' ? (
              <Button onClick={handleOpenAttendanceModal} className="gap-2 apple-btn-primary">
                <Plus className="h-4 w-4" /> Catat Absensi Tugas
              </Button>
            ) : (
              <Button onClick={handleOpenAddCollector} className="gap-2 apple-btn-primary">
                <Plus className="h-4 w-4" /> Tambah Petugas
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SUBTAB 1: REKAP ABSENSI & HONOR */}
      {subTab === 'attendance' && (
        <div className="space-y-4">
          {loadingAttendance ? (
            <div className="p-8 text-center text-xs text-[#707070] bg-white rounded-xl border border-[#d2d2d7]">
              Memuat data absensi...
            </div>
          ) : attendances.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#d2d2d7] space-y-3">
              <ClipboardList className="h-10 w-10 text-[#858585] mx-auto" />
              <p className="text-sm font-semibold text-[#1d1d1f]">Belum Ada Catatan Absensi</p>
              <p className="text-xs text-[#707070] max-w-md mx-auto">
                Catat absensi setiap kali pemuda bertugas mengambil sampah warga. Setiap kehadiran bernilai Rp 5.000 / orang.
              </p>
              {!isResident && (
                <Button onClick={handleOpenAttendanceModal} className="apple-btn-primary gap-1.5 text-xs mt-2">
                  <Plus className="h-4 w-4" /> Catat Tugas Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#d2d2d7] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7] text-[#707070] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Tanggal Tugas</th>
                      <th className="py-3 px-4">Petugas yang Bertugas</th>
                      <th className="py-3 px-4">Honor per Orang</th>
                      <th className="py-3 px-4">Total Pembayaran</th>
                      <th className="py-3 px-4">Catatan</th>
                      {!isResident && <th className="py-3 px-4 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5ea]">
                    {attendances.map((att) => (
                      <tr key={att.id} className="hover:bg-[#fbfbfd] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#1d1d1f] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-[#0071e3]" />
                            {new Date(att.date).toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {att.members && att.members.length > 0 ? (
                              att.members.map((m) => (
                                <Badge
                                  key={m.id}
                                  variant="secondary"
                                  className="text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200"
                                >
                                  {m.collector_name || 'Petugas'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[#858585] italic">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#707070]">
                          Rp {att.wage_per_person.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-700">
                          Rp {att.total_wage.toLocaleString('id-ID')}
                          <span className="text-[10px] text-[#707070] font-normal block">
                            ({att.members?.length || 0} orang)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#707070] max-w-xs truncate">
                          {att.notes || '-'}
                        </td>
                        {!isResident && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(att.id, att.date)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Catatan Absensi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DAFTAR MASTER PETUGAS SAMPAH */}
      {subTab === 'collectors' && (
        <div className="space-y-4">
          {loadingCollectors ? (
            <div className="p-8 text-center text-xs text-[#707070] bg-white rounded-xl border border-[#d2d2d7]">
              Memuat data petugas...
            </div>
          ) : collectors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#d2d2d7] space-y-3">
              <Users className="h-10 w-10 text-[#858585] mx-auto" />
              <p className="text-sm font-semibold text-[#1d1d1f]">Belum Ada Petugas Terdaftar</p>
              <p className="text-xs text-[#707070] max-w-md mx-auto">
                Tambahkan nama pemuda atau warga yang bertugas menarik sampah warga.
              </p>
              {!isResident && (
                <Button onClick={handleOpenAddCollector} className="apple-btn-primary gap-1.5 text-xs mt-2">
                  <Plus className="h-4 w-4" /> Tambah Petugas Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectors.map((c) => (
                <Card key={c.id} className="p-4 bg-white border border-[#d2d2d7] shadow-xs flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#1d1d1f]">{c.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-[#707070]">
                          <Phone className="h-3 w-3" />
                          <span>{c.phone || 'Tidak ada nomor HP'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-[10px]">
                      {c.is_active ? 'Aktif' : 'Non-aktif'}
                    </Badge>
                  </div>

                  {!isResident && (
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-[#e5e5ea]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditCollector(c)}
                        className="h-8 text-xs text-[#0071e3] hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCollector(c.id, c.name)}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CATAT ABSENSI */}
      <SimpleDialog
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title="Catat Absensi Pengambilan Sampah"
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="attDate">Tanggal Penarikan Sampah *</Label>
            <Input
              id="attDate"
              type="date"
              value={attendanceForm.date}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Pilih Petugas yang Bertugas (Bisa Lebih Dari 1) *</Label>
            {collectors.length === 0 ? (
              <p className="text-rose-600 italic">Belum ada master petugas. Silakan tambahkan petugas terlebih dahulu.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#d2d2d7] p-2.5 rounded-lg bg-[#fafafa]">
                {collectors
                  .filter((c) => c.is_active)
                  .map((c) => {
                    const isSelected = attendanceForm.collector_ids.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleCollectorSelection(c.id)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white'
                        }`}
                      >
                        <span className="font-medium text-[#1d1d1f]">{c.name}</span>
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 text-[#0071e3]" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-[#d2d2d7]" />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-[#f5f5f7] rounded-xl border border-[#d2d2d7]">
            <div>
              <span className="text-[11px] text-[#707070] block">Tarif per Orang</span>
              <span className="font-semibold text-sm text-[#1d1d1f]">
                Rp {attendanceForm.wage_per_person.toLocaleString('id-ID')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#707070] block">Estimasi Total Honor</span>
              <span className="font-bold text-sm text-emerald-700">
                Rp {(attendanceForm.collector_ids.length * attendanceForm.wage_per_person).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attNotes">Catatan Tambahan (Opsional)</Label>
            <Input
              id="attNotes"
              placeholder="Contoh: Penarikan sampah jalur blok A dan B"
              value={attendanceForm.notes}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAttendanceModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="apple-btn-primary">
              Simpan Absensi
            </Button>
          </div>
        </form>
      </SimpleDialog>

      {/* MODAL: TAMBAH / EDIT PETUGAS */}
      <SimpleDialog
        isOpen={isCollectorModalOpen}
        onClose={() => setIsCollectorModalOpen(false)}
        title={editingCollector ? 'Edit Data Petugas' : 'Tambah Petugas Sampah'}
      >
        <form onSubmit={handleSaveCollector} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label>Tautkan dengan Data Warga (Opsional)</Label>
            <SearchableResidentSelect
              residents={residents}
              value={collectorForm.resident_id}
              onChange={(resId) => {
                const found = residents.find((r) => r.id === resId);
                setCollectorForm({
                  ...collectorForm,
                  resident_id: resId,
                  name: found ? found.full_name : collectorForm.name,
                  phone: found?.phone ? found.phone : collectorForm.phone,
                });
              }}
              placeholder="Cari dari daftar warga..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="colName">Nama Lengkap Petugas *</Label>
            <Input
              id="colName"
              placeholder="Nama pemuda / petugas"
              value={collectorForm.name}
              onChange={(e) => setCollectorForm({ ...collectorForm, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="colPhone">Nomor HP / WhatsApp (Opsional)</Label>
            <Input
              id="colPhone"
              placeholder="0812xxxx"
              value={collectorForm.phone}
              onChange={(e) => setCollectorForm({ ...collectorForm, phone: e.target.value })}
            />
          </div>

          {editingCollector && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="colActive"
                checked={collectorForm.is_active}
                onChange={(e) => setCollectorForm({ ...collectorForm, is_active: e.target.checked })}
                className="rounded border-[#d2d2d7]"
              />
              <Label htmlFor="colActive">Status Aktif Bertugas</Label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsCollectorModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="apple-btn-primary">
              {editingCollector ? 'Simpan Perubahan' : 'Tambah Petugas'}
            </Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};
