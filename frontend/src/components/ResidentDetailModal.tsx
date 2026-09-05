import React from 'react';
import { Resident } from '../types/resident';
import { Dialog } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { UserCheck, Phone, MapPin, FileText, ExternalLink, Users, Edit3 } from 'lucide-react';

interface ResidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  onEdit?: (resident: Resident) => void;
  onAddFamily?: (residentId: string) => void;
}

export const ResidentDetailModal: React.FC<ResidentDetailModalProps> = ({
  isOpen,
  onClose,
  resident,
  onEdit,
  onAddFamily,
}) => {
  if (!resident) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Informasi Warga"
      description="Rincian data kependudukan, kartu keluarga, dan dokumen identitas"
      className="max-w-3xl"
    >
      <div className="space-y-6 pt-2">
        {/* Header Profil Singkat */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">{resident.full_name}</h3>
              {resident.is_head_of_family ? (
                <Badge variant="default" className="gap-1">
                  <UserCheck className="h-3 w-3" /> Kepala Keluarga
                </Badge>
              ) : (
                <Badge variant="secondary">Anggota Keluarga</Badge>
              )}
            </div>
            <p className="text-sm font-mono text-slate-500">NIK: {resident.nik || '-'}</p>
          </div>
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(resident);
              }}
              className="gap-1.5 self-start sm:self-auto"
            >
              <Edit3 className="h-4 w-4" /> Edit Data
            </Button>
          )}
        </div>

        {/* Informasi Pokok */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <Users className="h-4 w-4 text-emerald-600" /> Data Kependudukan
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Kartu Keluarga:</span>
                <span className="font-mono font-semibold text-slate-800">{resident.kk_number || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="font-medium text-slate-800">{resident.gender || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tempat, Tanggal Lahir:</span>
                <span className="font-medium text-slate-800">
                  {resident.birth_place || '-'}
                  {resident.birth_date ? `, ${new Date(resident.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Warga:</span>
                <Badge variant="success">Aktif Terdaftar</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <MapPin className="h-4 w-4 text-emerald-600" /> Kontak & Domisili
            </h4>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Telepon / WA:</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  {resident.phone ? (
                    <>
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      {resident.phone}
                    </>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RT / RW:</span>
                <span className="font-medium text-slate-800">{resident.rt_rw || '-'}</span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-slate-400">Alamat Lengkap:</span>
                <p className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg text-xs leading-relaxed border border-slate-100">
                  {resident.address || 'Alamat belum dilengkapi'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dokumen Foto KTP & KK */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" /> Dokumen & Berkas Identitas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Foto KTP */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px] text-center">
              <span className="text-xs font-bold text-slate-700 mb-2 self-start">Foto KTP Warga</span>
              {resident.ktp_url ? (
                <div className="space-y-2 w-full flex flex-col items-center">
                  {resident.ktp_url.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                    <img
                      src={resident.ktp_url}
                      alt="Foto KTP"
                      className="h-32 max-w-full object-contain rounded-lg border border-slate-200 bg-white shadow-sm"
                    />
                  ) : (
                    <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <span>Dokumen KTP (PDF / Arsip)</span>
                    </div>
                  )}
                  <a
                    href={resident.ktp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Buka Ukuran Penuh <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada foto KTP yang diunggah</p>
              )}
            </div>

            {/* Foto KK */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px] text-center">
              <span className="text-xs font-bold text-slate-700 mb-2 self-start">Foto Kartu Keluarga</span>
              {resident.kk_url ? (
                <div className="space-y-2 w-full flex flex-col items-center">
                  {resident.kk_url.match(/\.(jpeg|jpg|png|webp|gif)/i) ? (
                    <img
                      src={resident.kk_url}
                      alt="Foto Kartu Keluarga"
                      className="h-32 max-w-full object-contain rounded-lg border border-slate-200 bg-white shadow-sm"
                    />
                  ) : (
                    <div className="p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <span>Dokumen KK (PDF / Arsip)</span>
                    </div>
                  )}
                  <a
                    href={resident.kk_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Buka Ukuran Penuh <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada foto KK yang diunggah</p>
              )}
            </div>
          </div>
        </div>

        {/* Daftar Anggota Keluarga (Jika Kepala Keluarga) */}
        {resident.is_head_of_family && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Susunan Anggota Keluarga
              </h4>
              {onAddFamily && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddFamily(resident.id)}
                  className="gap-1 text-xs"
                >
                  + Tambah Anggota
                </Button>
              )}
            </div>

            {resident.family_members && resident.family_members.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Nama</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">NIK</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Hubungan</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Jenis Kelamin</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Tanggal Lahir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {resident.family_members.map((fm) => (
                      <tr key={fm.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-medium text-slate-800">{fm.full_name}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{fm.nik || '-'}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{fm.relation || 'Anggota'}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{fm.gender || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {fm.birth_date
                            ? new Date(fm.birth_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                Belum ada data anggota keluarga lain pada KK ini.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
