import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Plus,
  Trash2,
  Edit2,
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
import {
  useRTPeriods,
  useRTMembers,
  useCreateRTPeriod,
  useUpdateRTPeriod,
  useAddRTMember,
  useUpdateRTMember,
  useDeleteRTMember,
  RTMember,
  RTPeriod,
} from '../services/rt_structure';
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
import { WasteAttendanceTab } from '../components/WasteAttendanceTab';
import { Flame, Recycle, ShieldCheck, UserCheck, ClipboardCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const KarangTarunaPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [activeTab, setActiveTab] = useState<'rt_structure' | 'kt_structure' | 'waste_attendance'>('rt_structure');

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

  // Ratakan data kepala keluarga dan seluruh anggota keluarga (anak/istri)
  // agar pemuda Karang Taruna yang masih menumpang KK orang tua bisa langsung dipilih
  const allSelectableResidents = useMemo(() => {
    const list: Array<{
      id: string;
      full_name: string;
      nik?: string;
      phone?: string;
      house_number?: string;
    }> = [];

    residents.forEach((r) => {
      // Masukkan warga utama (Kepala Keluarga / Individu)
      list.push({
        id: r.id,
        full_name: r.full_name || 'Tanpa Nama',
        nik: r.nik || '',
        phone: r.phone || '',
        house_number: r.address || '',
      });
      // Masukkan seluruh anggota keluarga yang terdaftar
      if (r.family_members && r.family_members.length > 0) {
        r.family_members.forEach((fm: any) => {
          list.push({
            id: fm.id,
            full_name: `${fm.full_name} (${fm.relation || 'Anggota KK'} dari ${r.full_name})`,
            nik: fm.nik || '',
            phone: r.phone || '',
            house_number: r.address || '',
          });
        });
      }
    });

    return list;
  }, [residents]);

  // Queries RT Structure Resmi
  const { data: rtPeriodsRes } = useRTPeriods();
  const rtPeriods = rtPeriodsRes?.data || [];
  const activeRTPeriod = rtPeriods.find((p) => p.status === 'active') || (rtPeriods.length > 0 ? rtPeriods[0] : null);
  const [selectedRTPeriodId, setSelectedRTPeriodId] = useState<string>('');
  const currentRTPeriodId = selectedRTPeriodId || activeRTPeriod?.id || '';
  const currentRTPeriod = rtPeriods.find((p) => p.id === currentRTPeriodId) || activeRTPeriod;

  const { data: rtMembersRes, isLoading: loadingRTMembers } = useRTMembers(currentRTPeriodId);
  const rtMembers = rtMembersRes?.data || [];

  // Mutations RT Structure
  const createRTPeriod = useCreateRTPeriod();
  const updateRTPeriod = useUpdateRTPeriod();
  const addRTMember = useAddRTMember();
  const updateRTMember = useUpdateRTMember();
  const deleteRTMember = useDeleteRTMember();

  // Modal States RT Structure
  const [isRTMemberModalOpen, setIsRTMemberModalOpen] = useState(false);
  const [editingRTMember, setEditingRTMember] = useState<RTMember | null>(null);
  const [rtMemberForm, setRTMemberForm] = useState({
    resident_id: '',
    role: 'seksi',
    section: '',
    custom_title: '',
    phone_override: '',
    status: 'aktif',
  });

  // Master Seksi RT dengan localStorage fallback & dinamis CRUD
  const [rtSectionsList, setRtSectionsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sitransparan_rt_sections');
      return saved
        ? JSON.parse(saved)
        : [
            'Keamanan & Ketertiban',
            'Kebersihan & Lingkungan Hidup',
            'Sosial, Humas & Kematian',
            'Pembangunan & Sarana',
            'Kerohanian & Keagamaan',
            'Pemberdayaan Perempuan & Posyandu',
          ];
    } catch {
      return [
        'Keamanan & Ketertiban',
        'Kebersihan & Lingkungan Hidup',
        'Sosial, Humas & Kematian',
        'Pembangunan & Sarana',
        'Kerohanian & Keagamaan',
        'Pemberdayaan Perempuan & Posyandu',
      ];
    }
  });
  const [isAddingRTSection, setIsAddingRTSection] = useState(false);
  const [newRTSectionName, setNewRTSectionName] = useState('');

  const handleAddNewRTSection = () => {
    if (!newRTSectionName.trim()) return;
    const trimmed = newRTSectionName.trim();
    if (rtSectionsList.includes(trimmed)) {
      setRTMemberForm({ ...rtMemberForm, section: trimmed });
      setIsAddingRTSection(false);
      setNewRTSectionName('');
      return;
    }
    const updated = [...rtSectionsList, trimmed];
    setRtSectionsList(updated);
    try {
      localStorage.setItem('sitransparan_rt_sections', JSON.stringify(updated));
    } catch {}
    setRTMemberForm({ ...rtMemberForm, section: trimmed });
    setIsAddingRTSection(false);
    setNewRTSectionName('');
  };

  const handleDeleteRTSection = (secName: string) => {
    if (!confirm(`Hapus seksi "${secName}" dari daftar pilihan RT?`)) return;
    const updated = rtSectionsList.filter((s) => s !== secName);
    setRtSectionsList(updated);
    try {
      localStorage.setItem('sitransparan_rt_sections', JSON.stringify(updated));
    } catch {}
    if (rtMemberForm.section === secName) {
      setRTMemberForm({ ...rtMemberForm, section: '' });
    }
  };

  const [isRTPeriodModalOpen, setIsRTPeriodModalOpen] = useState(false);
  const [editingRTPeriod, setEditingRTPeriod] = useState<RTPeriod | null>(null);
  const [rtPeriodForm, setRTPeriodForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'active',
    sk_number: '',
  });

  // Mutations KT
  const createPeriod = useCreateKTPeriod();
  const updatePeriod = useUpdateKTPeriod();
  const addMember = useAddKTMember();
  const updateMember = useUpdateKTMember();
  const deleteMember = useDeleteKTMember();
  const updateConfig = useUpdateKTConfig();

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
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const handleAddNewSection = async () => {
    if (!newSectionName.trim()) return;
    const trimmed = newSectionName.trim();
    if (sectionsList.includes(trimmed)) {
      setMemberForm({ ...memberForm, section: trimmed });
      setIsAddingSection(false);
      setNewSectionName('');
      return;
    }
    const updated = [...sectionsList, trimmed];
    setSectionsList(updated);
    setMemberForm({ ...memberForm, section: trimmed });
    setIsAddingSection(false);
    setNewSectionName('');

    if (currentPeriodId) {
      await updateConfig.mutateAsync({
        periodId: currentPeriodId,
        allowed_roles: rolesList,
        allowed_sections: updated,
      });
    }
  };

  const handleDeleteSection = async (secName: string) => {
    if (!confirm(`Hapus seksi "${secName}" dari daftar master?`)) return;
    const updated = sectionsList.filter((s) => s !== secName);
    setSectionsList(updated);
    if (memberForm.section === secName) {
      setMemberForm({ ...memberForm, section: '' });
    }
    if (currentPeriodId) {
      await updateConfig.mutateAsync({
        periodId: currentPeriodId,
        allowed_roles: rolesList,
        allowed_sections: updated,
      });
    }
  };

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

  const empowermentTabs = [
    { to: '/admin/karang-taruna', label: 'Struktur Organisasi RT & Pemuda', icon: ShieldCheck },
    { to: '/admin/waste-bank', label: 'Bank Sampah Digital', icon: Recycle },
  ];

  return (
    <div className="space-y-6">
      <PageHeaderTabs
        title="Struktur Organisasi & Kepengurusan RT"
        description="Kelola susunan pejabat pengurus RT/RW resmi, organisasi kepemudaan Karang Taruna, dan masa bakti SK."
        tabs={empowermentTabs}
        actions={
          !isResident ? (
            <div className="flex items-center gap-2">
              {activeTab === 'rt_structure' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRTPeriod(null);
                      setRTPeriodForm({
                        name: '',
                        start_date: '',
                        end_date: '',
                        status: 'active',
                        sk_number: '',
                      });
                      setIsRTPeriodModalOpen(true);
                    }}
                    className="gap-1.5 text-xs border-[#d2d2d7]"
                  >
                    <Calendar className="h-4 w-4 text-[#707070]" /> Masa Bakti Baru
                  </Button>
                  <Button onClick={() => {
                    setEditingRTMember(null);
                    setRTMemberForm({
                      resident_id: '',
                      role: 'seksi',
                      section: '',
                      custom_title: '',
                      phone_override: '',
                      status: 'aktif',
                    });
                    setIsRTMemberModalOpen(true);
                  }} className="gap-2 apple-btn-primary">
                    <Plus className="h-4 w-4" /> Tambah Pengurus RT
                  </Button>
                </>
              )}
              {activeTab === 'kt_structure' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenPeriodModal()}
                    className="gap-1.5 text-xs border-[#d2d2d7]"
                  >
                    <Calendar className="h-4 w-4 text-[#707070]" /> Periode Pemuda Baru
                  </Button>
                  <Button onClick={() => handleOpenMemberModal()} className="gap-2 apple-btn-primary">
                    <Plus className="h-4 w-4" /> Tambah Pengurus Pemuda
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Navigation Tabs (Hanya 2 Tab Utama) */}
      <div className="flex items-center gap-2 border-b border-[#d2d2d7] pb-2">
        <button
          onClick={() => setActiveTab('rt_structure')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === 'rt_structure'
              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
              : 'text-[#707070] hover:bg-[#f5f5f7]'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-[#0071e3]" /> 1. Pengurus RT/RW ({rtMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('kt_structure')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === 'kt_structure'
              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
              : 'text-[#707070] hover:bg-[#f5f5f7]'
          }`}
        >
          <Flame className="h-4 w-4 text-amber-600" /> 2. Karang Taruna ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('waste_attendance')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === 'waste_attendance'
              ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
              : 'text-[#707070] hover:bg-[#f5f5f7]'
          }`}
        >
          <ClipboardCheck className="h-4 w-4 text-emerald-600" /> 3. Petugas & Absensi Sampah
        </button>
      </div>

      {/* TAB 1: STRUKTUR PENGURUS RT/RW RESMI */}
      {activeTab === 'rt_structure' && (
        <div className="space-y-6">
          {/* Period Selector Header on RT Structure */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#d2d2d7] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#f4f8fb] text-[#0071e3] rounded-xl border border-[#d2d2d7]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Masa Bakti Pengurus RT</p>
                <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                  {currentRTPeriod?.name || 'Belum ada masa bakti aktif'}
                  {currentRTPeriod?.status === 'active' && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      Aktif
                    </Badge>
                  )}
                </h3>
              </div>
            </div>

            {rtPeriods.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="rtPeriodSelect" className="text-xs text-[#707070] whitespace-nowrap">
                  Masa Bakti:
                </Label>
                <Select
                  id="rtPeriodSelect"
                  value={currentRTPeriodId}
                  onChange={(e) => setSelectedRTPeriodId(e.target.value)}
                  className="text-xs font-semibold bg-white border-[#d2d2d7]"
                >
                  {rtPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status === 'active' ? '(Aktif)' : `(${p.status})`}
                    </option>
                  ))}
                </Select>
                {!isResident && currentRTPeriod && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRTPeriod(currentRTPeriod);
                      setRTPeriodForm({
                        name: currentRTPeriod.name,
                        start_date: currentRTPeriod.start_date.split('T')[0],
                        end_date: currentRTPeriod.end_date.split('T')[0],
                        status: currentRTPeriod.status,
                        sk_number: currentRTPeriod.sk_number || '',
                      });
                      setIsRTPeriodModalOpen(true);
                    }}
                    className="h-8 text-xs border-[#d2d2d7]"
                    title="Edit masa bakti RT aktif"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {loadingRTMembers ? (
            <div className="p-12 text-center text-[#707070]">Memuat susunan pengurus RT/RW...</div>
          ) : rtMembers.length === 0 ? (
            <Card className="p-12 text-center bg-white border-dashed border-[#d2d2d7]">
              <UserCheck className="h-10 w-10 mx-auto text-[#858585] mb-3" />
              <p className="font-bold text-[#1d1d1f]">Belum ada susunan pengurus RT di periode ini</p>
              <p className="text-xs text-[#707070] mt-1 mb-4">
                Tetapkan Ketua RT, Sekretaris, Bendahara, dan Koordinator Seksi Lingkungan.
              </p>
              {!isResident && (
                <Button onClick={() => {
                  setEditingRTMember(null);
                  setRTMemberForm({
                    resident_id: '',
                    role: 'ketua',
                    section: '',
                    custom_title: 'Ketua RT',
                    phone_override: '',
                    status: 'aktif',
                  });
                  setIsRTMemberModalOpen(true);
                }} size="sm" className="apple-btn-primary">
                  <Plus className="h-4 w-4 mr-1" /> Tetapkan Ketua RT Pertama
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rtMembers.map((m) => {
                const isCore = ['ketua', 'wakil', 'sekretaris', 'bendahara'].includes(m.role);
                return (
                  <Card
                    key={m.id}
                    className={`p-5 flex flex-col justify-between transition hover:border-[#0071e3] ${
                      m.role === 'ketua'
                        ? 'border-[#0071e3] ring-1 ring-[#0071e3] bg-[#f4f8fb]/40'
                        : isCore
                        ? 'border-[#d2d2d7]'
                        : 'border-[#d2d2d7]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            m.role === 'ketua'
                              ? 'bg-[#0071e3] text-white border-transparent'
                              : 'bg-[#f5f5f7] text-[#1d1d1f] border-[#d2d2d7]'
                          }
                        >
                          {m.role.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            m.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-[#f5f5f7] text-[#707070] border-[#d2d2d7]'
                          }`}
                        >
                          {m.status}
                        </Badge>
                      </div>

                      <h4 className="mt-3 text-base font-bold text-[#1d1d1f] leading-snug">
                        {m.resident_name || 'Nama Warga'}
                      </h4>
                      {m.custom_title && (
                        <p className="text-xs font-semibold text-[#0066cc] mt-0.5">{m.custom_title}</p>
                      )}
                      {m.section && (
                        <p className="text-xs text-[#707070] mt-1 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-[#0071e3]" /> {m.section}
                        </p>
                      )}
                      {(m.phone_override || m.phone) && (
                        <p className="text-xs text-[#707070] mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[#858585]" /> {m.phone_override || m.phone}
                        </p>
                      )}
                    </div>

                    {!isResident && (
                      <div className="mt-4 pt-3 border-t border-[#e2e2e5] flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRTMember(m);
                            setRTMemberForm({
                              resident_id: m.resident_id,
                              role: m.role,
                              section: m.section || '',
                              custom_title: m.custom_title || '',
                              phone_override: m.phone_override || '',
                              status: m.status,
                            });
                            setIsRTMemberModalOpen(true);
                          }}
                          className="h-8 text-xs font-semibold text-[#707070] hover:text-[#1d1d1f]"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Hapus ${m.resident_name} dari kepengurusan RT?`)) {
                              await deleteRTMember.mutateAsync(m.id);
                            }
                          }}
                          className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KARANG TARUNA & PEMUDA */}
      {activeTab === 'kt_structure' && (
        <div className="space-y-6">
          {/* Period Selector Header on KT Structure */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#d2d2d7] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Periode Karang Taruna</p>
                <h3 className="text-sm font-bold text-[#1d1d1f] flex items-center gap-1.5">
                  {currentPeriod?.name || 'Belum ada periode aktif'}
                  {currentPeriod?.status === 'active' && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                      Aktif
                    </Badge>
                  )}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="periodSelect" className="text-xs text-[#707070] whitespace-nowrap">
                Ganti Periode:
              </Label>
              <Select
                id="periodSelect"
                value={currentPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="text-xs font-semibold bg-white border-[#d2d2d7]"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </Select>
              {!isResident && currentPeriod && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPeriodModal(currentPeriod)}
                  className="h-8 text-xs border-[#d2d2d7]"
                  title="Edit masa bakti pemuda"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {loadingMembers || loadingActive ? (
            <div className="p-12 text-center text-[#707070]">Memuat struktur pengurus pemuda...</div>
          ) : members.length === 0 ? (
            <Card className="p-12 text-center bg-white border-dashed border-[#d2d2d7]">
              <Users className="h-10 w-10 mx-auto text-[#858585] mb-3" />
              <p className="font-bold text-[#1d1d1f]">Belum ada pengurus pemuda di periode ini</p>
              <p className="text-xs text-[#707070] mt-1 mb-4">
                Tambahkan warga muda sebagai ketua, sekretaris, bendahara, atau koordinator seksi.
              </p>
              {!isResident && (
                <Button onClick={() => handleOpenMemberModal()} size="sm" className="apple-btn-primary">
                  <Plus className="h-4 w-4 mr-1" /> Tambah Pengurus Pemuda
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

      {/* Modal Periode RT */}
      <SimpleDialog
        isOpen={isRTPeriodModalOpen}
        onClose={() => setIsRTPeriodModalOpen(false)}
        title={editingRTPeriod ? 'Edit Masa Bakti Pengurus RT' : 'Buat Masa Bakti Pengurus RT Baru'}
        description="Atur nama masa bakti (misal: Masa Bakti 2024-2029) dan nomor SK pengukuhan."
        className="max-w-2xl"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!rtPeriodForm.name || !rtPeriodForm.start_date || !rtPeriodForm.end_date) return;
            try {
              if (editingRTPeriod) {
                await updateRTPeriod.mutateAsync({
                  id: editingRTPeriod.id,
                  ...rtPeriodForm,
                });
              } else {
                await createRTPeriod.mutateAsync(rtPeriodForm);
              }
              setIsRTPeriodModalOpen(false);
            } catch (err: any) {
              alert(err?.response?.data?.error || 'Gagal menyimpan periode RT');
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="rtPeriodName">Nama Masa Bakti *</Label>
            <Input
              id="rtPeriodName"
              required
              placeholder="Contoh: Masa Bakti RT 03 Periode 2024 - 2029"
              value={rtPeriodForm.name}
              onChange={(e) => setRTPeriodForm({ ...rtPeriodForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rtStartDate">Mulai *</Label>
              <Input
                id="rtStartDate"
                type="date"
                required
                value={rtPeriodForm.start_date}
                onChange={(e) => setRTPeriodForm({ ...rtPeriodForm, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtEndDate">Selesai *</Label>
              <Input
                id="rtEndDate"
                type="date"
                required
                value={rtPeriodForm.end_date}
                onChange={(e) => setRTPeriodForm({ ...rtPeriodForm, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rtStatus">Status</Label>
            <Select
              id="rtStatus"
              value={rtPeriodForm.status}
              onChange={(e) => setRTPeriodForm({ ...rtPeriodForm, status: e.target.value })}
            >
              <option value="active">Aktif (Utama)</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip / Demisioner</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rtSKNumber">Nomor SK Pengukuhan (Opsional)</Label>
            <Input
              id="rtSKNumber"
              placeholder="Contoh: SK.04/RW.05/KEL.MELATI/2024"
              value={rtPeriodForm.sk_number}
              onChange={(e) => setRTPeriodForm({ ...rtPeriodForm, sk_number: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-[#d2d2d7]">
            <Button type="button" variant="outline" onClick={() => setIsRTPeriodModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="apple-btn-primary">
              {editingRTPeriod ? 'Simpan Perubahan' : 'Terbitkan Periode'}
            </Button>
          </div>
        </form>
      </SimpleDialog>

      {/* Modal Anggota Pengurus RT */}
      <SimpleDialog
        isOpen={isRTMemberModalOpen}
        onClose={() => setIsRTMemberModalOpen(false)}
        title={editingRTMember ? 'Edit Data Pengurus RT' : 'Tambah / Tetapkan Pengurus RT'}
        description="Tetapkan warga ke dalam jabatan struktur kepengurusan RT/RW resmi."
        className="max-w-2xl"
        preventOutsideClose={true}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!currentRTPeriodId || !rtMemberForm.resident_id || !rtMemberForm.role) {
              alert('Harap pilih masa bakti, warga, dan jabatan pengurus.');
              return;
            }
            try {
              if (editingRTMember) {
                await updateRTMember.mutateAsync({
                  id: editingRTMember.id,
                  ...rtMemberForm,
                });
              } else {
                await addRTMember.mutateAsync({
                  period_id: currentRTPeriodId,
                  ...rtMemberForm,
                });
              }
              setIsRTMemberModalOpen(false);
            } catch (err: any) {
              alert(err?.response?.data?.error || 'Gagal menyimpan pengurus RT');
            }
          }}
          className="space-y-4"
        >
          {!editingRTMember && (
            <div className="space-y-1.5">
              <Label htmlFor="rtResidentSelect">Pilih Warga *</Label>
              <SearchableResidentSelect
                id="rtResidentSelect"
                required
                value={rtMemberForm.resident_id}
                onChange={(val) => setRTMemberForm({ ...rtMemberForm, resident_id: val })}
                residents={allSelectableResidents}
                placeholder="Cari nama atau NIK warga..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rtRole">Jabatan Pokok *</Label>
              <Select
                id="rtRole"
                value={rtMemberForm.role}
                onChange={(e) => setRTMemberForm({ ...rtMemberForm, role: e.target.value })}
              >
                <option value="ketua">Ketua RT</option>
                <option value="wakil">Wakil Ketua RT</option>
                <option value="sekretaris">Sekretaris</option>
                <option value="bendahara">Bendahara</option>
                <option value="seksi">Koordinator Seksi</option>
                <option value="penasihat">Penasihat / Tokoh Masyarakat</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="rtSection">Bidang / Seksi</Label>
                {!isAddingRTSection ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingRTSection(true)}
                    className="text-[11px] text-[#0071e3] hover:underline font-semibold"
                  >
                    + Buat Seksi Baru
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingRTSection(false)}
                    className="text-[11px] text-[#707070] hover:underline"
                  >
                    Batal
                  </button>
                )}
              </div>

              {!isAddingRTSection ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    id="rtSection"
                    value={rtMemberForm.section}
                    onChange={(e) => setRTMemberForm({ ...rtMemberForm, section: e.target.value })}
                    className="flex-1 text-xs"
                  >
                    <option value="">-- Tanpa Seksi (Pengurus Inti) --</option>
                    {rtSectionsList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  {rtMemberForm.section && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRTSection(rtMemberForm.section)}
                      className="h-9 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                      title="Hapus seksi ini dari daftar master RT"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Nama seksi baru (mis: Pemuda & Kreativitas)..."
                    value={newRTSectionName}
                    onChange={(e) => setNewRTSectionName(e.target.value)}
                    className="text-xs h-9"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewRTSection();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewRTSection}
                    className="h-9 text-xs apple-btn-primary shrink-0"
                  >
                    Simpan
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rtCustomTitle">Gelar / Sebutan Jabatan (Opsional)</Label>
              <Input
                id="rtCustomTitle"
                placeholder="Contoh: Ketua RT 03, Koordinator Pos Ronda"
                value={rtMemberForm.custom_title}
                onChange={(e) => setRTMemberForm({ ...rtMemberForm, custom_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rtPhone">No. WhatsApp Resmi (Opsional)</Label>
              <Input
                id="rtPhone"
                placeholder="Contoh: 081234567890"
                value={rtMemberForm.phone_override}
                onChange={(e) => setRTMemberForm({ ...rtMemberForm, phone_override: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#d2d2d7]">
            <Button type="button" variant="outline" onClick={() => setIsRTMemberModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="apple-btn-primary">
              {editingRTMember ? 'Simpan Perubahan' : 'Tetapkan Pengurus'}
            </Button>
          </div>
        </form>
      </SimpleDialog>

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

      {/* TAB 3: PETUGAS & ABSENSI PENARIKAN SAMPAH */}
      {activeTab === 'waste_attendance' && (
        <WasteAttendanceTab isResident={isResident} />
      )}

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
                residents={allSelectableResidents}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="memberSection">Seksi / Bidang</Label>
                {!isAddingSection ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(true)}
                    className="text-[11px] text-[#0071e3] hover:underline font-semibold"
                  >
                    + Buat Seksi Baru
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingSection(false)}
                    className="text-[11px] text-[#707070] hover:underline"
                  >
                    Batal
                  </button>
                )}
              </div>

              {!isAddingSection ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    id="memberSection"
                    value={memberForm.section}
                    onChange={(e) => setMemberForm({ ...memberForm, section: e.target.value })}
                    className="flex-1 text-xs"
                  >
                    <option value="">-- Tanpa Seksi (Inti) --</option>
                    {sectionsList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  {memberForm.section && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(memberForm.section)}
                      className="h-9 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                      title="Hapus seksi ini dari daftar master"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    placeholder="Nama seksi baru (mis: Olahraga, E-Sport)..."
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="text-xs h-9"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewSection();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewSection}
                    className="h-9 text-xs apple-btn-primary shrink-0"
                  >
                    Simpan
                  </Button>
                </div>
              )}
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
