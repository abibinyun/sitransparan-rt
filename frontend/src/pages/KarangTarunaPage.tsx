import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Award,
  Phone,
  Layers,
} from 'lucide-react';
import {
  useKTPeriods,
  useKTActivePeriod,
  useKTMembers,
  useCreateKTPeriod,
  useUpdateKTPeriod,
  useUpdateKTConfig,
  useAddKTMember,
  useUpdateKTMember,
  useDeleteKTMember,
} from '../services/karang_taruna';
import { useResidents } from '../services/resident';
import { SearchableResidentSelect } from '../components/ui/SearchableResidentSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { SimpleDialog } from '../components/ui/dialog';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { KarangTarunaPeriod, KarangTarunaMember } from '../types/karang_taruna';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { Flame, Recycle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const KarangTarunaPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [activeTab, setActiveTab] = useState<'structure' | 'periods' | 'config'>('structure');

  // Queries
  const { data: activePeriod, isLoading: loadingActive } = useKTActivePeriod();
  const { data: periodsRes } = useKTPeriods();
  const periods = periodsRes?.data || [];

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const currentPeriodId = selectedPeriodId || activePeriod?.id || (periods.length > 0 ? periods[0].id : '');
  const currentPeriod = periods.find((p) => p.id === currentPeriodId) || activePeriod;

  const { data: membersRes, isLoading: loadingMembers } = useKTMembers(currentPeriodId);
  const members = membersRes?.data || [];

  const { data: residentsRes } = useResidents({ limit: 1000 });
  const residents = Array.isArray(residentsRes) ? residentsRes : residentsRes?.data || [];

  // Mutations
  const createPeriod = useCreateKTPeriod();
  const updatePeriod = useUpdateKTPeriod();
  const updateConfig = useUpdateKTConfig();
  const addMember = useAddKTMember();
  const updateMember = useUpdateKTMember();
  const deleteMember = useDeleteKTMember();

  // Modal States
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<KarangTarunaPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'active',
    sk_number: '',
  });

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<KarangTarunaMember | null>(null);
  const [memberForm, setMemberForm] = useState({
    resident_id: '',
    role: 'anggota',
    section: '',
    custom_title: '',
    phone_override: '',
    status: 'aktif',
  });

  // Config State
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [sectionsList, setSectionsList] = useState<string[]>([]);
  const [newSection, setNewSection] = useState('');

  // Sync config when period changes
  React.useEffect(() => {
    if (currentPeriod?.config) {
      setRolesList(currentPeriod.config.allowed_roles || []);
      setSectionsList(currentPeriod.config.allowed_sections || []);
    } else {
      setRolesList(['ketua', 'wakil', 'sekretaris', 'bendahara', 'koordinator_seksi', 'anggota']);
      setSectionsList(['Olahraga & Kebugaran', 'Seni & Budaya', 'Sosial & Humas', 'Kerohanian & Kemitraan', 'Lingkungan Hidup']);
    }
  }, [currentPeriod]);

  // Handlers Period
  const handleOpenPeriodModal = (p?: KarangTarunaPeriod) => {
    if (p) {
      setEditingPeriod(p);
      setPeriodForm({
        name: p.name,
        start_date: p.start_date.slice(0, 10),
        end_date: p.end_date.slice(0, 10),
        status: p.status,
        sk_number: p.sk_number || '',
      });
    } else {
      setEditingPeriod(null);
      setPeriodForm({
        name: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10),
        status: 'active',
        sk_number: '',
      });
    }
    setIsPeriodModalOpen(true);
  };

  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPeriod) {
      await updatePeriod.mutateAsync({
        id: editingPeriod.id,
        payload: periodForm as any,
      });
    } else {
      await createPeriod.mutateAsync(periodForm);
    }
    setIsPeriodModalOpen(false);
  };

  // Handlers Member
  const handleOpenMemberModal = (m?: KarangTarunaMember) => {
    if (m) {
      setEditingMember(m);
      setMemberForm({
        resident_id: m.resident_id,
        role: m.role,
        section: m.section || '',
        custom_title: m.custom_title || '',
        phone_override: m.phone_override || '',
        status: m.status,
      });
    } else {
      setEditingMember(null);
      setMemberForm({
        resident_id: '',
        role: 'anggota',
        section: sectionsList[0] || '',
        custom_title: '',
        phone_override: '',
        status: 'aktif',
      });
    }
    setIsMemberModalOpen(true);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPeriodId) return;

    if (editingMember) {
      await updateMember.mutateAsync({
        id: editingMember.id,
        payload: {
          period_id: currentPeriodId,
          role: memberForm.role,
          section: memberForm.section || undefined,
          custom_title: memberForm.custom_title || undefined,
          phone_override: memberForm.phone_override || undefined,
          status: memberForm.status,
        },
      });
    } else {
      await addMember.mutateAsync({
        period_id: currentPeriodId,
        resident_id: memberForm.resident_id,
        role: memberForm.role,
        section: memberForm.section || undefined,
        custom_title: memberForm.custom_title || undefined,
        phone_override: memberForm.phone_override || undefined,
        status: memberForm.status,
      });
    }
    setIsMemberModalOpen(false);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (confirm(`Hapus ${name} dari kepengurusan pemuda?`)) {
      await deleteMember.mutateAsync({ id });
    }
  };

  // Handlers Config
  const handleSaveConfig = async () => {
    if (!currentPeriodId) return;
    await updateConfig.mutateAsync({
      periodId: currentPeriodId,
      allowed_roles: rolesList,
      allowed_sections: sectionsList,
    });
    alert('Konfigurasi seksi dan peran berhasil disimpan!');
  };

  const addSection = () => {
    if (newSection.trim() && !sectionsList.includes(newSection.trim())) {
      setSectionsList([...sectionsList, newSection.trim()]);
      setNewSection('');
    }
  };

  const removeSection = (sec: string) => {
    setSectionsList(sectionsList.filter((s) => s !== sec));
  };

  const empowermentTabs = [
    { to: '/admin/karang-taruna', label: 'Karang Taruna & Pemuda', icon: Flame },
    { to: '/admin/waste-bank', label: 'Bank Sampah Digital', icon: Recycle },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Unit Pemberdayaan & Inisiatif Lingkungan"
        description="Kelola organisasi kepemudaan Karang Taruna dan program ekonomi sirkular Bank Sampah warga."
        tabs={empowermentTabs}
        actions={
          !isResident ? (
            <div className="flex items-center gap-2">
              {activeTab === 'structure' && (
                <Button onClick={() => handleOpenMemberModal()} className="gap-2">
                  <Plus className="h-4 w-4" /> Tambah Pengurus
                </Button>
              )}
              {activeTab === 'periods' && (
                <Button onClick={() => handleOpenPeriodModal()} className="gap-2">
                  <Plus className="h-4 w-4" /> Periode Baru
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#d2d2d7] pb-2">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
            activeTab === 'structure'
              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
              : 'text-[#707070] hover:bg-[#f5f5f7]'
          }`}
        >
          <Users className="h-4 w-4" /> Struktur Pengurus
        </button>
        <button
          onClick={() => setActiveTab('periods')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
            activeTab === 'periods'
              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
              : 'text-[#707070] hover:bg-[#f5f5f7]'
          }`}
        >
          <Calendar className="h-4 w-4" /> Masa Bakti ({periods.length})
        </button>
        {!isResident && (
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === 'config'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="h-4 w-4" /> Konfigurasi Seksi & Peran
          </button>
        )}
      </div>

      {/* Period Selector Header on Structure Tab */}
      {activeTab === 'structure' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Periode Aktif</p>
              <h3 className="text-base font-black text-slate-900">
                {currentPeriod?.name || 'Belum ada periode'}
                {currentPeriod?.status === 'active' && (
                  <Badge variant="default" className="ml-2 bg-emerald-600 text-white text-[10px]">
                    Aktif
                  </Badge>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label htmlFor="periodSelect" className="text-xs text-slate-500 whitespace-nowrap">
              Ganti Periode:
            </Label>
            <Select
              id="periodSelect"
              value={currentPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-xs font-semibold"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* TAB 1: STRUKTUR PENGURUS */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          {loadingMembers || loadingActive ? (
            <div className="p-12 text-center text-slate-400">Memuat struktur pengurus pemuda...</div>
          ) : members.length === 0 ? (
            <Card className="p-12 text-center bg-white border-dashed">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-700">Belum ada pengurus di periode ini</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Tambahkan warga sebagai ketua, pengurus inti, atau koordinator seksi.
              </p>
              {!isResident && (
                <Button onClick={() => handleOpenMemberModal()} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Tambah Pengurus Pertama
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {members.map((m) => {
                const isCore = ['ketua', 'wakil', 'sekretaris', 'bendahara'].includes(m.role);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                      m.role === 'ketua'
                        ? 'border-emerald-300 ring-2 ring-emerald-100'
                        : isCore
                        ? 'border-indigo-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={m.role === 'ketua' ? 'default' : 'secondary'}
                          className={m.role === 'ketua' ? 'bg-emerald-700 text-white' : ''}
                        >
                          {m.role.toUpperCase()}
                        </Badge>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-black text-slate-900 leading-snug">
                        {m.resident_name || 'Nama Warga'}
                      </h4>
                      {m.custom_title && (
                        <p className="text-xs font-semibold text-indigo-600 mt-0.5">{m.custom_title}</p>
                      )}
                      {m.section && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-slate-400" /> {m.section}
                        </p>
                      )}
                      {(m.phone_override || m.phone) && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {m.phone_override || m.phone}
                        </p>
                      )}
                    </div>

                    {!isResident && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenMemberModal(m)}
                          className="h-8 text-xs font-semibold"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(m.id, m.resident_name || 'pengurus')}
                          className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAJEMEN PERIODE */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {periods.map((p) => (
              <div
                key={p.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                    <Badge
                      variant={p.status === 'active' ? 'default' : 'secondary'}
                      className={p.status === 'active' ? 'bg-emerald-600 text-white' : ''}
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(p.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })} s/d{' '}
                    {new Date(p.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}
                    {p.sk_number && ` · SK: ${p.sk_number}`}
                  </p>
                </div>

                {!isResident && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenPeriodModal(p)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Masa Bakti
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KONFIGURASI SEKSI & PERAN */}
      {activeTab === 'config' && (
        <Card className="bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Konfigurasi Bidang & Seksi Pemuda</h3>
            <p className="text-xs text-slate-500">
              Sesuaikan daftar divisi / bidang kegiatan pemuda pada periode {currentPeriod?.name || 'aktif'}.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Daftar Seksi / Bidang ({sectionsList.length})
            </Label>
            <div className="flex flex-wrap gap-2">
              {sectionsList.map((sec) => (
                <span
                  key={sec}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold"
                >
                  {sec}
                  <button
                    onClick={() => removeSection(sec)}
                    className="hover:text-rose-600 text-slate-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-2 max-w-md">
              <Input
                placeholder="Tambah nama seksi/bidang..."
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                Tambah
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleSaveConfig} className="bg-emerald-700 hover:bg-emerald-800">
              Simpan Konfigurasi
            </Button>
          </div>
        </Card>
      )}

      {/* Modal Periode */}
      <SimpleDialog
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        title={editingPeriod ? 'Edit Masa Bakti Karang Taruna' : 'Buat Masa Bakti Baru'}
        description="Atur nama periode, rentang tanggal kepengurusan, dan nomor SK."
        className="max-w-3xl"
      >
        <form onSubmit={handlePeriodSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="periodName">Nama Periode</Label>
            <Input
              id="periodName"
              required
              placeholder="Contoh: Masa Bakti 2024-2027"
              value={periodForm.name}
              onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Mulai</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={periodForm.start_date}
                onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Selesai</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={periodForm.end_date}
                onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodStatus">Status Periode</Label>
            <Select
              id="periodStatus"
              value={periodForm.status}
              onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value })}
            >
              <option value="active">Aktif (Utama)</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip / Demisioner</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skNumber">Nomor SK Pengukuhan (Opsional)</Label>
            <Input
              id="skNumber"
              placeholder="Contoh: SK-004/RT-03/2024"
              value={periodForm.sk_number}
              onChange={(e) => setPeriodForm({ ...periodForm, sk_number: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsPeriodModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">{editingPeriod ? 'Simpan Perubahan' : 'Terbitkan Periode'}</Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Anggota */}
      <SimpleDialog
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={editingMember ? 'Edit Data Pengurus' : 'Tambah Pengurus / Anggota Pemuda'}
        description={`Menugaskan warga ke dalam struktur kepengurusan ${currentPeriod?.name || ''}`}
        className="max-w-3xl"
        preventOutsideClose={true}
      >
        <form onSubmit={handleMemberSubmit} className="space-y-4">
          {!editingMember && (
            <div className="space-y-2">
              <Label htmlFor="residentSelect">Pilih Warga *</Label>
              <SearchableResidentSelect
                id="residentSelect"
                required
                value={memberForm.resident_id}
                onChange={(val) => setMemberForm({ ...memberForm, resident_id: val })}
                residents={residents}
                placeholder="Cari nama atau NIK warga..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="memberRole">Jabatan / Peran</Label>
              <Select
                id="memberRole"
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              >
                {rolesList.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberSection">Seksi / Bidang</Label>
              <Select
                id="memberSection"
                value={memberForm.section}
                onChange={(e) => setMemberForm({ ...memberForm, section: e.target.value })}
              >
                <option value="">-- Tanpa Seksi (Inti) --</option>
                {sectionsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customTitle">Nama Jabatan Khusus (Opsional)</Label>
            <Input
              id="customTitle"
              placeholder="Contoh: Koordinator Futsal & E-Sport"
              value={memberForm.custom_title}
              onChange={(e) => setMemberForm({ ...memberForm, custom_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneOverride">Nomor Kontak Pemuda (Opsional)</Label>
            <Input
              id="phoneOverride"
              placeholder="0812xxxx"
              value={memberForm.phone_override}
              onChange={(e) => setMemberForm({ ...memberForm, phone_override: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberStatus">Status Keanggotaan</Label>
            <Select
              id="memberStatus"
              value={memberForm.status}
              onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })}
            >
              <option value="aktif">Aktif</option>
              <option value="demisioner">Demisioner</option>
              <option value="nonaktif">Non-aktif</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsMemberModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">{editingMember ? 'Simpan Perubahan' : 'Tetapkan Pengurus'}</Button>
          </div>
        </form>
      </SimpleDialog>
    </div>
  );
};

export default KarangTarunaPage;
