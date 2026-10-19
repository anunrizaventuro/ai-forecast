# Tuai FE — Documentation

Dokumen ini menjelaskan standar dan pattern yang disepakati di proyek ini. Claude Code dan developer baru membaca ini untuk memahami "cara proyek ini bekerja" tanpa harus reverse-engineer dari kode.

## Quick reference

- **[CONVENTIONS.md](CONVENTIONS.md)** — bullet-list ringkas aturan main proyek. Baca ini dulu.

## Deep dives (pattern per topik)

Baca yang relevan dengan pekerjaan saat ini:

| Topik | File | Kapan dibaca |
|---|---|---|
| Cara menambah feature baru | [patterns/feature-module.md](patterns/feature-module.md) | Saat scaffold feature baru (cash-in, expense, dll.) |
| UX dialog CRUD | [patterns/dialog-crud.md](patterns/dialog-crud.md) | Saat bikin dialog create/edit/view |
| API layer & envelope | [patterns/api-layer.md](patterns/api-layer.md) | Saat wire endpoint BE baru |
| Form fields custom | [patterns/form-fields.md](patterns/form-fields.md) | Saat pakai amount/currency/date fields |
| Date range picker | [patterns/date-range-picker.md](patterns/date-range-picker.md) | Saat butuh filter periode (start_date + end_date) di list/report |
| Upload lampiran | [patterns/attachments.md](patterns/attachments.md) | Saat feature butuh file upload |
| Approval & audit log | [patterns/approval-audit.md](patterns/approval-audit.md) | Saat feature punya alur approval |
| Reference data cache | [patterns/reference-data.md](patterns/reference-data.md) | Saat butuh dropdown yang isinya dari BE |
| Feedback (snackbar & error dialog) | [patterns/feedback.md](patterns/feedback.md) | Saat bikin aksi user yang butuh notifikasi sukses/error |
| Laporan (read-only report page) | [patterns/reports.md](patterns/reports.md) | Saat bikin laporan baru (general ledger, income statement, dll) |

## Canonical reference

Semua pattern ini diimplementasi di `src/module/finance/features/fund-transfer/`. Saat ragu, baca kode di sana sebagai "referensi hidup" — ikuti pola yang sama untuk feature baru.
