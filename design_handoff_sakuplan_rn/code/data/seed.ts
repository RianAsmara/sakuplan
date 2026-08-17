import type { AppState } from '../lib/finance'

/**
 * Seed data, verbatim from the prototype. Keep it for development and for tests —
 * the "Perlu perhatian" state on Home depends on it (Iuran RT is overdue, Hiburan is
 * over budget), so replacing it with empty data will make Home look wrong.
 */
export const seedState: AppState = {
  userName: 'Dewi',
  paydayDay: '25',
  safetyBuffer: '500000',
  aiConsent: true,
  accounts: [
    { id: 1, name: 'Kas Tunai', type: 'Tunai', balance: 850000 },
    { id: 2, name: 'BCA', type: 'Bank', balance: 4200000 },
    { id: 3, name: 'GoPay', type: 'E-Wallet', balance: 320000 },
    { id: 4, name: 'Tabungan Darurat', type: 'Tabungan', balance: 6000000 },
  ],
  transactions: [
    { id: 1, date: '2026-08-04', desc: 'Kopi Kenangan', category: 'Makan & Minum', account: 'Kas Tunai', amount: -35000 },
    { id: 2, date: '2026-08-03', desc: 'Gojek', category: 'Transportasi', account: 'GoPay', amount: -45000 },
    { id: 3, date: '2026-08-03', desc: 'Indomaret', category: 'Belanja Rumah Tangga', account: 'BCA', amount: -128000 },
    { id: 4, date: '2026-08-02', desc: 'Gaji Agustus', category: 'Pemasukan', account: 'BCA', amount: 8500000 },
    { id: 5, date: '2026-08-02', desc: 'Bioskop CGV', category: 'Hiburan', account: 'Kas Tunai', amount: -150000 },
    { id: 6, date: '2026-08-01', desc: 'Iuran RT', category: 'Lain-lain', account: 'Kas Tunai', amount: -150000 },
    { id: 7, date: '2026-07-31', desc: 'Transfer ke Dana Darurat', category: 'Tabungan', account: 'BCA', amount: -500000 },
  ],
  budgets: [
    { id: 1, name: 'Makan & Minum', allocated: 2000000, spent: 1230000 },
    { id: 2, name: 'Transportasi', allocated: 800000, spent: 540000 },
    { id: 3, name: 'Belanja Rumah Tangga', allocated: 1200000, spent: 980000 },
    { id: 4, name: 'Hiburan', allocated: 500000, spent: 610000 },
    { id: 5, name: 'Lain-lain', allocated: 400000, spent: 120000 },
  ],
  bills: [
    { id: 1, name: 'Iuran RT', amount: 150000, due: '2026-08-01', status: 'overdue' },
    { id: 2, name: 'BPJS Kesehatan', amount: 150000, due: '2026-08-05', status: 'paid' },
    { id: 3, name: 'Listrik PLN', amount: 450000, due: '2026-08-10', status: 'upcoming' },
    { id: 4, name: 'Internet IndiHome', amount: 350000, due: '2026-08-15', status: 'upcoming' },
    { id: 5, name: 'Cicilan Motor', amount: 1200000, due: '2026-08-20', status: 'upcoming' },
  ],
  goals: [
    { id: 1, name: 'Dana Darurat', target: 20000000, contributed: 6000000, deadline: '2026-12-31' },
    { id: 2, name: 'Liburan Bali', target: 8000000, contributed: 2400000, deadline: '2027-06-30' },
  ],
  notifications: [
    { id: 1, text: 'Tagihan Iuran RT sudah lewat jatuh tempo 3 hari.', read: false },
    { id: 2, text: 'Anggaran Hiburan sudah terlampaui bulan ini.', read: false },
    { id: 3, text: 'Gaji Rp8.500.000 sudah masuk ke BCA.', read: true },
    { id: 4, text: '3 minggu lagi menuju gajian.', read: true },
  ],
  aiSuggestions: [
    { id: 1, kind: 'update', category: 'Hiburan', current: 500000, suggested: 650000, reason: 'Pengeluaran Hiburan melebihi Rp500.000 selama 3 bulan berturut-turut.' },
    { id: 2, kind: 'update', category: 'Belanja Rumah Tangga', current: 1200000, suggested: 1050000, reason: 'Rata-rata pemakaian 3 bulan terakhir Rp1.050.000, lebih rendah dari alokasi saat ini.' },
    { id: 3, kind: 'new', category: 'Kesehatan', current: 0, suggested: 300000, reason: 'Terdeteksi pengeluaran rutin BPJS & obat yang belum punya kategori anggaran.' },
  ],
  sessions: [
    { id: 1, device: 'iPhone 15 — Jakarta', current: true, active: 'Aktif sekarang' },
    { id: 2, device: 'Chrome, Windows — Jakarta', current: false, active: '2 hari lalu' },
  ],
}

/** Placeholder chart series from the prototype. Replace with real aggregates. */
export const seedChart = {
  months: ['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt'],
  income: [8500000, 8500000, 8500000, 8500000, 8500000, 8500000],
  expense: [3200000, 3900000, 3600000, 4400000, 4100000, 3480000],
}

/**
 * The prototype froze "now" so the overdue bill and the payday countdown stayed
 * reproducible. Keep the injection point: pass a real Date in production, this one in tests.
 */
export const FROZEN_TODAY = new Date(2026, 7, 4)
