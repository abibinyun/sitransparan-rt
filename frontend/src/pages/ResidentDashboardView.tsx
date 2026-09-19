import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Coins,
  Recycle,
  MessageSquareHeart,
  Send,
  CalendarDays,
  Flame,
  UserCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useMyHouseQuery } from '../services/house';
import { useDuesPayments } from '../services/financial';
import { useAspirations } from '../services/aspiration_need';
import { useHouseholdAccumulationsQuery } from '../services/wasteBank';
import type { DuesPayment } from '../types/financial';
import type { HouseholdAccumulation } from '../services/wasteBank';

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);

export const ResidentDashboardView: React.FC = () => {
  const { user, activeTenant } = useAuthStore();
  const { data: houseData } = useMyHouseQuery();
  const { data: duesData } = useDuesPayments({ limit: 50 });
  const { data: aspirationsData } = useAspirations({ limit: 50 });
  const { data: wasteData } = useHouseholdAccumulationsQuery(1, 100);

  const house = houseData?.house;
  const head = houseData?.head_resident;

  // Filter dues payments KHUSUS resident / KK warga ini.
  // Jika warga belum ditautkan ke data KK/resident, KOSONGKAN ([]), jangan pernah bocorkan data orang lain!
  const duesList: DuesPayment[] = duesData?.data || [];
  const myDues = React.useMemo(() => {
    const validResidentIds = [head?.id, (user as any)?.resident_id].filter(Boolean);
    const validNames = [user?.name?.trim().toLowerCase(), head?.full_name?.trim().toLowerCase()].filter(Boolean);
    
    // Jika tidak ada data identitas resident/KK tertaut, jangan tampilkan data iuran sembarang orang
    if (validResidentIds.length === 0 && validNames.length === 0) return [];

    return duesList.filter((d: DuesPayment) => {
      if (d.resident_id && validResidentIds.includes(d.resident_id)) return true;
      if (d.resident_name) {
        const dName = d.resident_name.trim().toLowerCase();
        return validNames.some((n) => n && (dName === n || dName.includes(n)));
      }
      return false;
    });
  }, [duesList, head, user]);

  const pendingDues = myDues.filter((d: DuesPayment) => d.status === 'pending' || !d.status);
  const paidDues = myDues.filter((d: DuesPayment) => d.status === 'verified');
  const totalPaidAmount = paidDues.reduce((acc: number, curr: DuesPayment) => acc + (curr.amount || 0), 0);

  // Filter aspirasi milik warga ini (berdasarkan author_name yang cocok dengan user.name atau head.full_name)
  // Jangan fallback ke semua data orang lain
  const allAspirations = aspirationsData?.data || [];
  const myAspirations = React.useMemo(() => {
    const validNames = [user?.name?.trim().toLowerCase(), head?.full_name?.trim().toLowerCase()].filter(Boolean);
    if (validNames.length === 0) return [];

    return allAspirations.filter((a) => {
      if (a.is_anonymous) return false;
      const author = a.author_name?.trim().toLowerCase();
      return validNames.some((n) => n && (author === n || author?.includes(n)));
    });
  }, [allAspirations, user, head]);

  // Tabungan bank sampah KK milik warga ini saja
  const myWaste = React.useMemo(() => {
    const list: HouseholdAccumulation[] = wasteData?.data || [];
    if (!house?.block_number && !head?.full_name) return null;
    return list.find((item: HouseholdAccumulation) => {
      const matchBlock = house?.block_number && item.house_number?.toLowerCase() === house.block_number.toLowerCase();
      const matchName = head?.full_name && item.family_head_name?.toLowerCase().includes(head.full_name.toLowerCase());
      return matchBlock || matchName;
    });
  }, [wasteData, house, head]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Hero Banner */}
      <section className="apple-card p-5 sm:p-7 border-[#d2d2d7] bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="apple-badge">
              <Home className="h-3.5 w-3.5 text-[#0071e3]" />
              <span>Portal Mandiri Warga RT</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
              Selamat Datang, {user?.name || 'Warga'}
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-[#707070] leading-relaxed">
              Pantau status iuran keluarga, tabungan bank sampah, ajukan usulan lingkungan, dan akses informasi warga RT dengan transparan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <NavLink
              to="/admin/profile"
              className="apple-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <UserCircle className="h-4 w-4 text-[#0066cc]" />
              Edit Profil Saya
            </NavLink>
            <NavLink
              to="/admin/aspirations"
              className="apple-btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-white" />
              Kirim Usulan
            </NavLink>
          </div>
        </div>
      </section>

      {/* Ringkasan Kartu Data Rumah & Keluarga */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kartu Rumah */}
        <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Rumah Terdaftar</p>
              <p className="mt-1.5 text-lg sm:text-xl font-semibold text-[#1d1d1f] truncate">
                {house?.block_number || 'Rumah Terdaftar'}
              </p>
              <p className="mt-0.5 text-xs text-[#707070] truncate">
                {house?.address || activeTenant?.name || 'RT Terdaftar'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] shrink-0">
              <Home className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#d2d2d7] flex items-center justify-between text-xs">
            <span className="text-[#707070]">Kepala Keluarga:</span>
            <span className="font-semibold text-[#1d1d1f] truncate max-w-[120px]">
              {head?.full_name || user?.name || '-'}
            </span>
          </div>
        </div>

        {/* Kartu Status Iuran KK */}
        <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Status Iuran KK</p>
              <p className="mt-1.5 text-lg sm:text-xl font-semibold text-[#1d1d1f] truncate">
                {pendingDues.length === 0 ? 'Lunas / Nihil' : `${pendingDues.length} Tertunda`}
              </p>
              <p className="mt-0.5 text-xs text-[#707070]">
                {pendingDues.length === 0 ? 'Semua tagihan terverifikasi' : 'Perlu penyelesaian iuran'}
              </p>
            </div>
            <div className={`p-2 rounded-lg border shrink-0 ${pendingDues.length === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              <Coins className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#d2d2d7] flex items-center justify-between text-xs">
            <span className="text-[#707070]">Total Terbayar:</span>
            <span className="font-semibold text-[#0066cc] tabular-nums">{formatRupiah(totalPaidAmount)}</span>
          </div>
        </div>

        {/* Kartu Tabungan Sampah */}
        <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Tabungan Sampah</p>
              <p className="mt-1.5 text-lg sm:text-xl font-semibold text-[#0066cc] tabular-nums truncate">
                {formatRupiah(myWaste?.total_earnings_amount || 0)}
              </p>
              <p className="mt-0.5 text-xs text-[#707070]">
                {myWaste ? `${myWaste.total_weight_kg} kg terkumpul` : 'Belum ada setoran'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#f4f8fb] text-[#0066cc] border border-[#d2d2d7] shrink-0">
              <Recycle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#d2d2d7] flex items-center justify-between text-xs">
            <span className="text-[#707070]">Frekuensi:</span>
            <span className="font-semibold text-[#1d1d1f]">
              {myWaste?.deposit_count || 0} kali setoran
            </span>
          </div>
        </div>

        {/* Kartu Usulan & Aspirasi Saya */}
        <div className="apple-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#707070]">Usulan Saya</p>
              <p className="mt-1.5 text-lg sm:text-xl font-semibold text-[#1d1d1f] truncate">
                {myAspirations.length} Diajukan
              </p>
              <p className="mt-0.5 text-xs text-[#707070]">
                {myAspirations.filter((a) => a.status === 'resolved').length} selesai ditindaklanjuti
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] shrink-0">
              <MessageSquareHeart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#d2d2d7] flex items-center justify-between text-xs">
            <span className="text-[#707070]">Dalam Proses:</span>
            <span className="font-semibold text-amber-700">
              {myAspirations.filter((a) => a.status === 'submitted' || a.status === 'under_review').length}
            </span>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom Konten Spesifik */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Kolom Kiri: Riwayat Iuran KK Terakhir */}
        <div className="apple-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#d2d2d7]">
            <div>
              <h2 className="font-semibold text-[#1d1d1f] text-base">Riwayat Iuran Keluarga</h2>
              <p className="text-xs text-[#707070]">Status pembayaran iuran lingkungan RT Anda</p>
            </div>
            <NavLink
              to="/admin/financial"
              className="text-xs font-semibold text-[#0066cc] hover:underline flex items-center gap-1"
            >
              Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {myDues.length === 0 ? (
            <div className="py-8 text-center text-[#707070] text-xs">
              Belum ada riwayat pembayaran iuran yang tercatat.
            </div>
          ) : (
            <div className="space-y-2.5">
              {myDues.slice(0, 5).map((due: DuesPayment) => (
                <div
                  key={due.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#1d1d1f]">{due.fee_category_name || 'Iuran Bulanan'}</p>
                    <p className="text-[11px] text-[#707070] mt-0.5">
                      Periode: Bulan {due.period_month} / {due.period_year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1d1d1f] tabular-nums">{formatRupiah(due.amount || 0)}</p>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        due.status === 'verified'
                          ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                          : due.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {due.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Status Usulan & Aspirasi Saya */}
        <div className="apple-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#d2d2d7]">
            <div>
              <h2 className="font-semibold text-[#1d1d1f] text-base">Usulan &amp; Aduan Saya</h2>
              <p className="text-xs text-[#707070]">Pantau respon pengurus RT atas aspirasi Anda</p>
            </div>
            <NavLink
              to="/admin/aspirations"
              className="text-xs font-semibold text-[#0066cc] hover:underline flex items-center gap-1"
            >
              Semua Usulan <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {myAspirations.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-[#707070]">Anda belum mengajukan usulan atau aduan lingkungan.</p>
              <NavLink
                to="/admin/aspirations"
                className="apple-btn-secondary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5 text-[#0066cc]" /> Buat Usulan Pertama
              </NavLink>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myAspirations.slice(0, 5).map((asp) => (
                <div
                  key={asp.id}
                  className="p-3.5 rounded-lg bg-[#f5f5f7] border border-[#d2d2d7] text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#1d1d1f] line-clamp-1">{asp.title}</p>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        asp.status === 'resolved'
                          ? 'bg-[#f4f8fb] text-[#0066cc] border-[#d2d2d7]'
                          : asp.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {asp.status}
                    </span>
                  </div>
                  <p className="text-[#474747] line-clamp-2 text-[11px] leading-relaxed">
                    {asp.content}
                  </p>
                  {asp.response && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#f4f8fb] border border-[#d2d2d7] text-[#1d1d1f] text-[11px]">
                      <span className="font-semibold text-[#0066cc] block">Tanggapan Pengurus:</span>
                      {asp.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Akses Cepat & Menu Penting */}
      <div className="apple-card p-5 sm:p-6 space-y-3.5 bg-white">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Aksi Cepat Lingkungan</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <NavLink
            to="/agenda"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e2e2e5] border border-[#d2d2d7] transition"
          >
            <div className="p-2 rounded-md bg-white border border-[#d2d2d7] text-[#0071e3]">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1d1d1f]">Agenda &amp; Kegiatan RT</p>
              <p className="text-[10px] text-[#707070]">Lihat acara &amp; gotong royong</p>
            </div>
          </NavLink>

          <NavLink
            to="/admin/waste-bank"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e2e2e5] border border-[#d2d2d7] transition"
          >
            <div className="p-2 rounded-md bg-white border border-[#d2d2d7] text-[#0071e3]">
              <Recycle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1d1d1f]">Bank Sampah Lingkungan</p>
              <p className="text-[10px] text-[#707070]">Kategori &amp; harga sampah</p>
            </div>
          </NavLink>

          <NavLink
            to="/admin/karang-taruna"
            className="flex items-center gap-3 p-3.5 rounded-lg bg-[#f5f5f7] hover:bg-[#e2e2e5] border border-[#d2d2d7] transition"
          >
            <div className="p-2 rounded-md bg-white border border-[#d2d2d7] text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1d1d1f]">Karang Taruna RT</p>
              <p className="text-[10px] text-[#707070]">Pengurus &amp; program pemuda</p>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
