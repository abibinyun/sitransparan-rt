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

  // Filter dues payments khusus resident ini atau kepala keluarga jika ada
  const duesList: DuesPayment[] = duesData?.data || [];
  const myDues = React.useMemo(() => {
    if (!head?.id) return duesList;
    return duesList.filter((d: DuesPayment) => d.resident_id === head.id);
  }, [duesList, head]);

  const pendingDues = myDues.filter((d: DuesPayment) => d.status === 'pending' || !d.status);
  const paidDues = myDues.filter((d: DuesPayment) => d.status === 'verified');
  const totalPaidAmount = paidDues.reduce((acc: number, curr: DuesPayment) => acc + (curr.amount || 0), 0);

  // Filter aspirasi saya (berdasarkan author_name yang cocok dengan user.name atau head.full_name)
  const allAspirations = aspirationsData?.data || [];
  const myAspirations = React.useMemo(() => {
    const names = [user?.name?.toLowerCase(), head?.full_name?.toLowerCase()].filter(Boolean);
    return allAspirations.filter((a) => {
      const author = a.author_name?.toLowerCase();
      return names.some((n) => n && author && (author.includes(n) || n.includes(author)));
    });
  }, [allAspirations, user, head]);

  // Tabungan bank sampah KK milik warga ini
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
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.35),transparent_24rem),radial-gradient(circle_at_85%_30%,rgba(20,184,166,0.25),transparent_20rem)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-200 backdrop-blur">
              <Home className="h-3.5 w-3.5" />
              <span>Portal Mandiri Warga RT</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              Selamat Datang, {user?.name || 'Warga'}
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pantau status iuran keluarga, tabungan bank sampah, ajukan usulan lingkungan, dan akses informasi warga RT dengan transparan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <NavLink
              to="/admin/profile"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition backdrop-blur"
            >
              <UserCircle className="h-4 w-4" />
              Edit Profil Saya
            </NavLink>
            <NavLink
              to="/admin/aspirations"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/20 transition"
            >
              <Send className="h-4 w-4" />
              Kirim Usulan / Aduan
            </NavLink>
          </div>
        </div>
      </section>

      {/* Ringkasan Kartu Data Rumah & Keluarga */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kartu Rumah */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Atas Nama / Rumah</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {house?.block_number || 'Rumah Terdaftar'}
              </p>
              <p className="mt-1 text-xs text-slate-500 truncate max-w-[180px]">
                {house?.address || activeTenant?.name || 'RT Terdaftar'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
              <Home className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Kepala Keluarga:</span>
            <span className="font-semibold text-slate-700 truncate max-w-[120px]">
              {head?.full_name || user?.name || '-'}
            </span>
          </div>
        </div>

        {/* Kartu Status Iuran KK */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Iuran KK</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {pendingDues.length === 0 ? 'Lunas / Nihil' : `${pendingDues.length} Tertunda`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {pendingDues.length === 0 ? 'Semua tagihan terverifikasi' : 'Perlu penyelesaian iuran'}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${pendingDues.length === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Terbayar:</span>
            <span className="font-bold text-emerald-600">{formatRupiah(totalPaidAmount)}</span>
          </div>
        </div>

        {/* Kartu Tabungan Sampah */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tabungan Sampah</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {formatRupiah(myWaste?.total_earnings_amount || 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {myWaste ? `${myWaste.total_weight_kg} kg terkumpul` : 'Belum ada setoran'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
              <Recycle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Frekuensi:</span>
            <span className="font-semibold text-slate-700">
              {myWaste?.deposit_count || 0} kali setoran
            </span>
          </div>
        </div>

        {/* Kartu Usulan & Aspirasi Saya */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Usulan Saya</p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {myAspirations.length} Diajukan
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {myAspirations.filter((a) => a.status === 'resolved').length} selesai ditindaklanjuti
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <MessageSquareHeart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Dalam Proses:</span>
            <span className="font-semibold text-amber-600">
              {myAspirations.filter((a) => a.status === 'submitted' || a.status === 'under_review').length}
            </span>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom Konten Spesifik */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Kolom Kiri: Riwayat Iuran KK Terakhir */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">Riwayat Iuran Keluarga</h2>
              <p className="text-xs text-slate-400">Status pembayaran iuran lingkungan RT Anda</p>
            </div>
            <NavLink
              to="/admin/financial"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {myDues.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada riwayat pembayaran iuran yang tercatat.
            </div>
          ) : (
            <div className="space-y-3">
              {myDues.slice(0, 5).map((due: DuesPayment) => (
                <div
                  key={due.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{due.fee_category_name || 'Iuran Bulanan'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Periode: Bulan {due.period_month} / {due.period_year}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatRupiah(due.amount || 0)}</p>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        due.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-700'
                          : due.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
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
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">Usulan & Aduan Saya</h2>
              <p className="text-xs text-slate-400">Pantau respon pengurus RT atas aspirasi Anda</p>
            </div>
            <NavLink
              to="/admin/aspirations"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Semua Usulan <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {myAspirations.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-slate-400">Anda belum mengajukan usulan atau aduan lingkungan.</p>
              <NavLink
                to="/admin/aspirations"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition"
              >
                <Send className="w-3.5 h-3.5" /> Buat Usulan Pertama
              </NavLink>
            </div>
          ) : (
            <div className="space-y-3">
              {myAspirations.slice(0, 5).map((asp) => (
                <div
                  key={asp.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800 line-clamp-1">{asp.title}</p>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        asp.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : asp.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {asp.status}
                    </span>
                  </div>
                  <p className="text-slate-500 line-clamp-2 text-[11px] leading-relaxed">
                    {asp.content}
                  </p>
                  {asp.response && (
                    <div className="mt-2 p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-[11px]">
                      <span className="font-bold block">Tanggapan Pengurus:</span>
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
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Aksi Cepat Lingkungan</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <NavLink
            to="/agenda"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-white">Agenda & Kegiatan RT</p>
              <p className="text-[11px] text-slate-400">Lihat acara & gotong royong</p>
            </div>
          </NavLink>

          <NavLink
            to="/admin/waste-bank"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <Recycle className="w-5 h-5 text-teal-400" />
            <div>
              <p className="text-xs font-bold text-white">Bank Sampah Lingkungan</p>
              <p className="text-[11px] text-slate-400">Kategori & harga sampah</p>
            </div>
          </NavLink>

          <NavLink
            to="/admin/karang-taruna"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs font-bold text-white">Karang Taruna RT</p>
              <p className="text-[11px] text-slate-400">Pengurus & program pemuda</p>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
};
