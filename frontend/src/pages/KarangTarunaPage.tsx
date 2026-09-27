import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  ShieldCheck,
  Flame,
  Recycle,
  ClipboardCheck,
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
import { Button } from '../components/ui/button';
import { KarangTarunaPeriod, KarangTarunaMember, KarangTarunaPeriodStatus } from '../types/karang_taruna';
import { PageHeaderTabs } from '../components/ui/PageHeaderTabs';
import { WasteAttendanceTab } from '../components/WasteAttendanceTab';
import { useAuthStore } from '../store/useAuthStore';

// Modular Components
import { RTStructureTab } from '../components/karang-taruna/RTStructureTab';
import { KTStructureTab } from '../components/karang-taruna/KTStructureTab';
import { RTPeriodModal } from '../components/karang-taruna/RTPeriodModal';
import { RTMemberModal } from '../components/karang-taruna/RTMemberModal';
import { KTPeriodModal } from '../components/karang-taruna/KTPeriodModal';
import { KTMemberModal } from '../components/karang-taruna/KTMemberModal';

export const KarangTarunaPage: React.FC = () => {
  const { user } = useAuthStore();
  const isResident = String(user?.role || '').toLowerCase() === 'resident';
  const [activeTab, setActiveTab] = useState<'rt_structure' | 'kt_structure' | 'waste_attendance'>('rt_structure');

  // Queries KT
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

  // Ratakan data kepala keluarga dan seluruh anggota keluarga
  const allSelectableResidents = useMemo(() => {
    const list: { id: string; full_name: string; nik?: string; phone?: string; house_number?: string }[] = [];
    residents.forEach((r: any) => {
      list.push({
        id: r.id,
        full_name: r.full_name,
        nik: r.nik,
        phone: r.phone,
        house_number: r.house_number || (r.house?.block_number ? `Blok ${r.house.block_number}` : undefined),
      });

      if (Array.isArray(r.family_members)) {
        r.family_members.forEach((fm: any) => {
          list.push({
            id: fm.id,
            full_name: fm.full_name,
            nik: fm.nik,
            phone: fm.phone || r.phone,
            house_number: r.house_number || (r.house?.block_number ? `Blok ${r.house.block_number}` : undefined),
          });
        });
      }
    });
    return list;
  }, [residents]);

  // Queries RT Structure
  const { data: rtPeriodsRes } = useRTPeriods();
  const rtPeriods: RTPeriod[] = rtPeriodsRes?.data || [];
  const activeRTPeriod = rtPeriods.find((p) => p.status === 'active');
  const [selectedRTPeriodId, setSelectedRTPeriodId] = useState<string>('');
  const currentRTPeriodId = selectedRTPeriodId || activeRTPeriod?.id || (rtPeriods.length > 0 ? rtPeriods[0].id : '');
  const currentRTPeriod = rtPeriods.find((p) => p.id === currentRTPeriodId) || activeRTPeriod || null;

  const { data: rtMembersRes, isLoading: loadingRTMembers } = useRTMembers(currentRTPeriodId);
  const rtMembers: RTMember[] = rtMembersRes?.data || [];

  // Mutations KT
  const createPeriod = useCreateKTPeriod();
  const updatePeriod = useUpdateKTPeriod();
  const updateConfig = useUpdateKTConfig();
  const addMember = useAddKTMember();
  const updateMember = useUpdateKTMember();
  const deleteMember = useDeleteKTMember();

  // Mutations RT Structure
  const createRTPeriod = useCreateRTPeriod();
  const updateRTPeriod = useUpdateRTPeriod();
  const addRTMember = useAddRTMember();
  const updateRTMember = useUpdateRTMember();
  const deleteRTMember = useDeleteRTMember();

  // RT Sections management
  const defaultRTSections = ['Keamanan & Ketertiban', 'Kebersihan & Lingkungan', 'Pembangunan', 'Sosial & Kesejahteraan'];
  const [customRTSections, setCustomRTSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sitransparan_custom_rt_sections');
      return saved ? JSON.parse(saved) : defaultRTSections;
    } catch {
      return defaultRTSections;
    }
  });
  const rtSectionsList = useMemo(() => {
    const list = new Set([...customRTSections]);
    rtMembers.forEach((m) => {
      if (m.section) list.add(m.section);
    });
    return Array.from(list);
  }, [customRTSections, rtMembers]);

  const [isAddingRTSection, setIsAddingRTSection] = useState(false);
  const [newRTSectionName, setNewRTSectionName] = useState('');

  const handleAddNewRTSection = () => {
    if (!newRTSectionName.trim()) return;
    const name = newRTSectionName.trim();
    if (!customRTSections.includes(name)) {
      const updated = [...customRTSections, name];
      setCustomRTSections(updated);
      try {
        localStorage.setItem('sitransparan_custom_rt_sections', JSON.stringify(updated));
      } catch {}
    }
    setRTMemberForm((prev) => ({ ...prev, section: name }));
    setNewRTSectionName('');
    setIsAddingRTSection(false);
  };

  const handleDeleteRTSection = (name: string) => {
    if (confirm(`Hapus seksi "${name}" dari daftar pilihan?`)) {
      const updated = customRTSections.filter((s) => s !== name);
      setCustomRTSections(updated);
      try {
        localStorage.setItem('sitransparan_custom_rt_sections', JSON.stringify(updated));
      } catch {}
      if (rtMemberForm.section === name) {
        setRTMemberForm((prev) => ({ ...prev, section: '' }));
      }
    }
  };

  // KT Config (Roles & Sections)
  const defaultRoles = ['ketua', 'wakil', 'sekretaris', 'bendahara', 'seksi', 'anggota'];
  const defaultSections = ['Humas & Media', 'Olahraga & Seni', 'Sosial & Kerohanian', 'Kewirausahaan'];
  const rolesList = (currentPeriod?.config?.allowed_roles && currentPeriod.config.allowed_roles.length > 0)
    ? currentPeriod.config.allowed_roles
    : defaultRoles;
  const sectionsList = (currentPeriod?.config?.allowed_sections && currentPeriod.config.allowed_sections.length > 0)
    ? currentPeriod.config.allowed_sections
    : defaultSections;

  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const handleAddNewSection = async () => {
    if (!newSectionName.trim() || !currentPeriod) return;
    const updated = [...sectionsList, newSectionName.trim()];
    try {
      await updateConfig.mutateAsync({
        periodId: currentPeriod.id,
        allowed_roles: rolesList,
        allowed_sections: updated,
      });
      setMemberForm((prev) => ({ ...prev, section: newSectionName.trim() }));
      setNewSectionName('');
      setIsAddingSection(false);
    } catch {
      alert('Gagal menambah seksi');
    }
  };

  const handleDeleteSection = async (sectionName: string) => {
    if (!currentPeriod) return;
    if (confirm(`Hapus seksi ${sectionName}?`)) {
      const updated = sectionsList.filter((s: string) => s !== sectionName);
      try {
        await updateConfig.mutateAsync({
          periodId: currentPeriod.id,
          allowed_roles: rolesList,
          allowed_sections: updated,
        });
        if (memberForm.section === sectionName) {
          setMemberForm((prev) => ({ ...prev, section: '' }));
        }
      } catch {
        alert('Gagal menghapus seksi');
      }
    }
  };

  // Modal states - KT
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<KarangTarunaPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState<{
    name: string;
    start_date: string;
    end_date: string;
    status: KarangTarunaPeriodStatus;
    sk_number: string;
  }>({
    name: '',
    start_date: '',
    end_date: '',
    status: 'draft',
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

  // Modal states - RT Structure
  const [isRTPeriodModalOpen, setIsRTPeriodModalOpen] = useState(false);
  const [editingRTPeriod, setEditingRTPeriod] = useState<RTPeriod | null>(null);
  const [rtPeriodForm, setRTPeriodForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'active',
    sk_number: '',
  });

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

  // Handlers KT
  const handleOpenPeriodModal = (period?: KarangTarunaPeriod) => {
    if (period) {
      setEditingPeriod(period);
      setPeriodForm({
        name: period.name,
        start_date: period.start_date.split('T')[0],
        end_date: period.end_date.split('T')[0],
        status: period.status,
        sk_number: period.sk_number || '',
      });
    } else {
      setEditingPeriod(null);
      setPeriodForm({
        name: '',
        start_date: '',
        end_date: '',
        status: 'draft',
        sk_number: '',
      });
    }
    setIsPeriodModalOpen(true);
  };

  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPeriod) {
      await updatePeriod.mutateAsync({ id: editingPeriod.id, payload: periodForm });
    } else {
      await createPeriod.mutateAsync(periodForm);
    }
    setIsPeriodModalOpen(false);
  };

  const handleOpenMemberModal = (member?: KarangTarunaMember) => {
    if (member) {
      setEditingMember(member);
      setMemberForm({
        resident_id: member.resident_id,
        role: member.role,
        section: member.section || '',
        custom_title: member.custom_title || '',
        phone_override: member.phone_override || '',
        status: member.status,
      });
    } else {
      setEditingMember(null);
      setMemberForm({
        resident_id: '',
        role: 'anggota',
        section: '',
        custom_title: '',
        phone_override: '',
        status: 'aktif',
      });
    }
    setIsMemberModalOpen(true);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPeriod) return;
    if (editingMember) {
      await updateMember.mutateAsync({
        id: editingMember.id,
        payload: {
          period_id: currentPeriod.id,
          role: memberForm.role,
          section: memberForm.section || undefined,
          custom_title: memberForm.custom_title || undefined,
          phone_override: memberForm.phone_override || undefined,
          status: memberForm.status,
        },
      });
    } else {
      await addMember.mutateAsync({
        period_id: currentPeriod.id,
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

  // Handlers RT Structure
  const handleRTPeriodSubmit = async (e: React.FormEvent) => {
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
  };

  const handleRTMemberSubmit = async (e: React.FormEvent) => {
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
  };

  const handleDeleteRTMember = async (id: string, name: string) => {
    if (confirm(`Hapus ${name} dari kepengurusan RT?`)) {
      await deleteRTMember.mutateAsync(id);
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
                  <Button
                    onClick={() => {
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
                    }}
                    className="gap-2 apple-btn-primary"
                  >
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

      {/* Navigation Tabs (3 Tab Terpadu) */}
      <div className="border-b border-[#d2d2d7]">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 -mb-px">
          <button
            onClick={() => setActiveTab('rt_structure')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition shrink-0 whitespace-nowrap ${
              activeTab === 'rt_structure'
                ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
                : 'text-[#707070] hover:bg-[#f5f5f7]'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-[#0071e3]" /> 1. Pengurus RT/RW ({rtMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('kt_structure')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition shrink-0 whitespace-nowrap ${
              activeTab === 'kt_structure'
                ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
                : 'text-[#707070] hover:bg-[#f5f5f7]'
            }`}
          >
            <Flame className="h-4 w-4 text-amber-600" /> 2. Karang Taruna ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('waste_attendance')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition shrink-0 whitespace-nowrap ${
              activeTab === 'waste_attendance'
                ? 'bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7]'
                : 'text-[#707070] hover:bg-[#f5f5f7]'
            }`}
          >
            <ClipboardCheck className="h-4 w-4 text-emerald-600" /> 3. Petugas &amp; Absensi Sampah
          </button>
        </div>
      </div>

      {/* TAB 1: STRUKTUR PENGURUS RT/RW RESMI */}
      {activeTab === 'rt_structure' && (
        <RTStructureTab
          currentRTPeriod={currentRTPeriod}
          currentRTPeriodId={currentRTPeriodId}
          rtPeriods={rtPeriods}
          rtMembers={rtMembers}
          loadingRTMembers={loadingRTMembers}
          isResident={isResident}
          onSelectPeriod={setSelectedRTPeriodId}
          onOpenEditPeriodModal={(period) => {
            setEditingRTPeriod(period);
            setRTPeriodForm({
              name: period.name,
              start_date: period.start_date.split('T')[0],
              end_date: period.end_date.split('T')[0],
              status: period.status,
              sk_number: period.sk_number || '',
            });
            setIsRTPeriodModalOpen(true);
          }}
          onOpenAddMemberModal={() => {
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
          }}
          onOpenEditMemberModal={(m) => {
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
          onDeleteMember={handleDeleteRTMember}
        />
      )}

      {/* TAB 2: KARANG TARUNA & PEMUDA */}
      {activeTab === 'kt_structure' && (
        <KTStructureTab
          currentPeriod={currentPeriod || null}
          currentPeriodId={currentPeriodId}
          periods={periods}
          members={members}
          loadingMembers={loadingMembers}
          loadingActive={loadingActive}
          isResident={isResident}
          onSelectPeriod={setSelectedPeriodId}
          onOpenEditPeriodModal={handleOpenPeriodModal}
          onOpenAddMemberModal={() => handleOpenMemberModal()}
          onOpenEditMemberModal={handleOpenMemberModal}
          onDeleteMember={handleDeleteMember}
        />
      )}

      {/* TAB 3: PETUGAS & ABSENSI PENARIKAN SAMPAH */}
      {activeTab === 'waste_attendance' && (
        <WasteAttendanceTab isResident={isResident} />
      )}

      {/* Modals RT Structure */}
      <RTPeriodModal
        isOpen={isRTPeriodModalOpen}
        onClose={() => setIsRTPeriodModalOpen(false)}
        editingPeriod={editingRTPeriod}
        form={rtPeriodForm}
        setForm={setRTPeriodForm}
        onSubmit={handleRTPeriodSubmit}
        isSubmitting={createRTPeriod.isPending || updateRTPeriod.isPending}
      />

      <RTMemberModal
        isOpen={isRTMemberModalOpen}
        onClose={() => setIsRTMemberModalOpen(false)}
        editingMember={editingRTMember}
        form={rtMemberForm}
        setForm={setRTMemberForm}
        allSelectableResidents={allSelectableResidents}
        rtSectionsList={rtSectionsList}
        isAddingSection={isAddingRTSection}
        setIsAddingSection={setIsAddingRTSection}
        newSectionName={newRTSectionName}
        setNewSectionName={setNewRTSectionName}
        onAddNewSection={handleAddNewRTSection}
        onDeleteSection={handleDeleteRTSection}
        onSubmit={handleRTMemberSubmit}
        isSubmitting={addRTMember.isPending || updateRTMember.isPending}
      />

      {/* Modals Karang Taruna */}
      <KTPeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        editingPeriod={editingPeriod}
        form={periodForm}
        setForm={setPeriodForm}
        onSubmit={handlePeriodSubmit}
        isSubmitting={createPeriod.isPending || updatePeriod.isPending}
      />

      <KTMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        editingMember={editingMember}
        currentPeriodName={currentPeriod?.name}
        form={memberForm}
        setForm={setMemberForm}
        allSelectableResidents={allSelectableResidents}
        rolesList={rolesList}
        sectionsList={sectionsList}
        isAddingSection={isAddingSection}
        setIsAddingSection={setIsAddingSection}
        newSectionName={newSectionName}
        setNewSectionName={setNewSectionName}
        onAddNewSection={handleAddNewSection}
        onDeleteSection={handleDeleteSection}
        onSubmit={handleMemberSubmit}
        isSubmitting={addMember.isPending || updateMember.isPending}
      />
    </div>
  );
};

export default KarangTarunaPage;
