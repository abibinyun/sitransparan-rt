import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useUpdateProfileMutation } from '../services/auth';
import { Shield, User as UserIcon, Phone, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, activeTenant } = useAuthStore();
  const updateProfileMutation = useUpdateProfileMutation();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama tidak boleh kosong');
      return;
    }

    try {
      const res = await updateProfileMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      updateUser({ name: res.user.name, phone: res.user.phone });
      setSuccessMsg('Informasi profil berhasil diperbarui!');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Gagal memperbarui profil');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword) {
      setErrorMsg('Password lama wajib diisi untuk mengubah password');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password baru tidak cocok');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Password berhasil diperbarui!');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Gagal mengubah password');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Profil Pengguna</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola informasi akun Anda. Email dan hak akses peran dikunci oleh sistem.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Kolom Kiri: Informasi Pribadi & Akun */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Informasi Pribadi</h2>
                <p className="text-xs text-slate-400">Nama lengkap & kontak WhatsApp</p>
              </div>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nomor HP / WhatsApp
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                </button>
              </div>
            </form>
          </div>

          {/* Akun Read-Only Box */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Otoritas & Keamanan Akun</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Alamat Email</span>
                <span className="font-mono font-semibold text-slate-700">{user?.email || '-'}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">(Email terkunci oleh sistem keamanan)</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block font-medium">Peran / Role</span>
                <span className="inline-block mt-1 px-2.5 py-1 rounded-lg bg-indigo-100/70 text-indigo-700 font-bold uppercase tracking-wider text-[11px]">
                  {user?.role}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block font-medium">Lingkup RT / Tenant Aktif</span>
                <span className="font-semibold text-slate-700">{activeTenant?.name || 'Semua Tenant'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Ubah Password */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Ubah Kata Sandi</h2>
              <p className="text-xs text-slate-400">Verifikasi password lama wajib dilakukan</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password Lama <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Password Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Konfirmasi Password Baru <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || !oldPassword || !newPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-200 hover:bg-amber-700 transition disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Mengubah...' : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
