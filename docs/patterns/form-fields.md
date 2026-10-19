# Pattern: Form Fields

Proyek pakai **react-hook-form + Zod**. Field components ada di [src/shared/ui/hook-form/](../../src/shared/ui/hook-form/).

## Field namespace

```tsx
import { Form, Field } from 'src/shared/ui/hook-form';
import { useTranslate } from 'src/locales';

const { t } = useTranslate('fund-transfer');

// Wrapper form — semua label via t()
<Form methods={methods} onSubmit={onSubmit}>
  <Field.Text name="email" label={t('form.email')} />
  <Field.Select name="status" label={t('form.status')}>
    <MenuItem value="active">{t('statuses.active')}</MenuItem>
  </Field.Select>
  <Field.DatePicker name="date" label={t('form.date')} format="DD MMM YYYY" />
  <Field.Autocomplete name="contact" options={[...]} label={t('form.contact')} />
  <Field.Checkbox name="is_active" label={t('form.isActive')} />
</Form>
```

Namespace members: `Text`, `Select`, `MultiSelect`, `Checkbox`, `MultiCheckbox`, `Switch`, `MultiSwitch`, `RadioGroup`, `Autocomplete`, `Slider`, `Rating`, `DatePicker`, `TimePicker`, `DateTimePicker`.

## Zod schema — factory pattern dengan i18n

**Jangan hardcode message** di schema. Wrap schema dalam factory `makeSchema(t)` lalu `useMemo` agar messages ikut bahasa aktif dan re-generate saat language change:

```tsx
import type { TFunction } from 'i18next';
import * as z from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useTranslate } from 'src/locales';

function makeSchema(t: TFunction) {
  return z
    .object({
      name: z.string().min(1, { message: t('validation.nameRequired') }),
      amount: z
        .number({ message: t('validation.amountRequired') })
        .positive(t('validation.amountPositive')),
      to_account_id: z.string().min(1, { message: t('validation.toAccountRequired') }),
      from_account_id: z.string().min(1, { message: t('validation.fromAccountRequired') }),
    })
    .refine((d) => d.from_account_id !== d.to_account_id, {
      message: t('validation.toMustDiffer'),
      path: ['to_account_id'],
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// Di component
const { t } = useTranslate('fund-transfer');
const schema = useMemo(() => makeSchema(t), [t]);

const methods = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {...},
});
```

Reference: [fund-transfer-form-dialog.tsx](../../src/module/finance/features/fund-transfer/components/fund-transfer-form-dialog.tsx)

### `.nullish()` untuk optional BE fields

Field ID opsional (contact_id, cost_center_id, dept_id, project_id, dll.) yang BE bisa kirim `null` **ATAU** omit key entirely (jadi `undefined`) — **harus pakai `.nullish()`**, bukan `.nullable()`:

```ts
// ❌ Wrong — reject undefined, validation error saat BE tidak include key
contact_id: z.string().nullable(),

// ✅ Correct — accept string | null | undefined
contact_id: z.string().nullish(),
```

Symptom kalau salah: validation error `"Invalid input: expected string, received undefined"` muncul tanpa user input apa pun, Save button gak ada reaksi (kalau error handler tidak di-surface).

Dampingi dengan coerce `?? null` di `defaultValues` supaya state konsisten `string | null` (tidak mixed dengan `undefined`):

```tsx
contact_id: line.contact_id ?? null,
cost_center_id: line.cost_center_id ?? null,
```

### Error handler untuk handleSubmit

Validation error default **silent** — Alert di-helperText per field. Kalau ada field tersembunyi / field yang tidak langsung kelihatan, user akan merasa button Save "tidak ada reaksi". Surface pesan pertama lewat Alert global:

```tsx
function extractFirstErrorMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (!value) continue;
    if (typeof value === 'object') {
      const maybeMsg = (value as { message?: unknown }).message;
      if (typeof maybeMsg === 'string' && maybeMsg.length > 0) return maybeMsg;
      const nested = extractFirstErrorMessage(value);
      if (nested) return nested;
    }
  }
  return null;
}

const onValidationError = (errors) => {
  setErrorMsg(extractFirstErrorMessage(errors) ?? t('form.validationFailed'));
};

const onSaveDraft = handleSubmit((v) => performSave(v, false), onValidationError);
const onSaveAndSubmit = handleSubmit((v) => performSave(v, true), onValidationError);
```

## RHFNumericField — amount dengan format titik ribuan

**JANGAN pakai `Field.Text type="number"`** untuk nominal/currency. Tidak ada thousand separator.

Pakai custom wrapper:

```tsx
import { RHFNumericField } from '.../components/rhf-numeric-field';

<RHFNumericField name="amount" label="Jumlah (IDR)" prefix="Rp" />
<RHFNumericField name="exchange_rate" label="Kurs (IDR per unit)" />
<RHFNumericField name="amount" label="Total" disabled prefix="Rp"
  helperText="Otomatis = jumlah × kurs" />
```

Behavior:
- Value di form state = **number** murni (submit ke BE tanpa formatting)
- Display di input = `Intl.NumberFormat('id-ID').format(value)` → `20.000` / `15.500.000`
- On input: strip non-digit, parse balik ke number
- Paste `"1.250.000"` otomatis ke-parse jadi `1250000`
- `inputMode="numeric"` supaya mobile keyboard muncul numeric

Reference: [rhf-numeric-field.tsx](../../src/module/finance/features/fund-transfer/components/rhf-numeric-field.tsx)

> Saat ini integer-only. Kalau butuh decimal nanti, extend dengan `allowDecimal` prop.

## Constrained text input (telepon, NPWP, kode, dll)

Field text yang hanya boleh berisi karakter tertentu (telepon = digit + `+` / `-` / `(` / `)` / spasi; NPWP = digit + `.` + `-`; dll) **harus sanitize di `onChange`** supaya user tidak bisa ketik karakter invalid sama sekali. Jangan hanya andalkan Zod regex — validasi baru muncul setelah submit, user sudah terlanjur ketik huruf.

Pola: `Controller` + `TextField` dengan sanitizer di `onChange`:

```tsx
import { Controller, useFormContext } from 'react-hook-form';
import TextField from '@mui/material/TextField';

<Controller
  name="phone"
  control={control}
  render={({ field, fieldState: { error } }) => (
    <TextField
      {...field}
      fullWidth
      label={t('form.phone')}
      placeholder="+62..."
      type="tel"
      error={!!error}
      helperText={error?.message}
      onChange={(e) => field.onChange(e.target.value.replace(/[^\d+\-()\s]/g, ''))}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { inputMode: 'tel', autoComplete: 'tel' },
      }}
    />
  )}
/>
```

**Dua layer defense:**
1. **`onChange` sanitize** — strip karakter invalid sebelum commit ke form state. User ketik huruf → tidak muncul.
2. **Zod regex** — safety net untuk value yang masuk via default (edit mode dari BE) atau paste:
   ```ts
   phone: z
     .string()
     .max(30, { message: t('validation.phoneMax') })
     .regex(/^[\d+\-()\s]*$/, { message: t('validation.phoneInvalid') })
     .optional()
     .or(z.literal('')),
   ```

**`inputMode` + `type` matters:**
- Telepon: `type="tel"` + `inputMode="tel"` — keyboard numeric di mobile, tidak ada autocorrect
- Kode (digit-only): `inputMode="numeric"` + `pattern="[0-9]*"`
- Email: `type="email"` — sudah built-in, tidak perlu sanitize

**Jangan pakai `Field.Text type="tel"`** untuk ini — `Field.Text` tidak expose sanitizer hook; wrap dengan `Controller` langsung.

Reference: [contact-form-dialog.tsx](../../src/module/finance/features/contacts/components/contact-form-dialog.tsx) — field `phone`.

## Field.DatePicker

`LocalizationProvider` di [src/locales/localization-provider.tsx](../../src/locales/localization-provider.tsx) otomatis sync `adapterLocale` ke bahasa aktif (id/en) — tidak perlu config manual per form.

```tsx
<Field.DatePicker name="transfer_date" label="Tanggal" format="DD MMM YYYY" />
```

Value di form state = ISO string dari `dayjs().format()`. Saat submit ke BE:

```ts
const payload = {
  transfer_date: dayjs(values.transfer_date).format('YYYY-MM-DD'),
};
```

## Non-RHF DatePicker (filter di toolbar)

Kalau tidak dalam form (mis. date range filter), pakai `@mui/x-date-pickers/DatePicker` langsung:

```tsx
<DatePicker
  label="Dari tanggal"
  value={toDayjs(filters.date_from)}
  onChange={(next) =>
    onFilterChange({ date_from: next && next.isValid() ? next.format('YYYY-MM-DD') : '' })
  }
  maxDate={toDayjs(filters.date_to) ?? undefined}
  format="DD MMM YYYY"
  slotProps={{
    textField: { sx: { width: 200 } },  // fixed width supaya clear button tidak geser layout
    field: { clearable: true },
  }}
/>
```

## Dialog form + auto-reset

```tsx
// Reset form state saat dialog membuka entity baru
useEffect(() => {
  methods.reset(defaultValues);
}, [defaultValues, methods]);

// Reset error state saat dialog tutup
useEffect(() => {
  if (!open) setErrorMsg(null);
}, [open]);
```

## Submit pattern

```tsx
const { handleSubmit, formState: { isSubmitting } } = methods;

const performSave = async (values: FormValues, submitAfter: boolean) => {
  setErrorMsg(null);
  submitting.onTrue();
  try {
    const payload = { /* transform values → BE payload */ };
    const saved = mode === 'new' ? await create(payload) : await update(id, payload);
    onSaved(saved);
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : t('form.saveFailed'));
  } finally {
    submitting.onFalse();
  }
};

const onSaveDraft = handleSubmit((v) => performSave(v, false));
const onSaveAndSubmit = handleSubmit((v) => performSave(v, true));
```

## Select dengan reference data

Pakai cached hook, bukan hardcode options:

```tsx
import { useBranches } from 'src/module/core/features/branches/hooks/use-branches';
import { useAccounts } from 'src/module/finance/features/chart-of-accounts/hooks/use-accounts';

const branchesQuery = useBranches();
const accountsQuery = useAccounts({ account_type: 'asset', is_active: true, is_header: false });

<Field.Select name="from_account_id" label="Akun Sumber">
  {accountsQuery.data.map((a) => (
    <MenuItem key={a.id} value={a.id}>
      {a.code} — {a.name}
      {a.currency_code !== 'IDR' && <Typography variant="caption">({a.currency_code})</Typography>}
    </MenuItem>
  ))}
</Field.Select>
```

Lihat [patterns/reference-data.md](reference-data.md) untuk cache behavior.

## Autocomplete untuk list panjang

Saat options >20, prefer `Field.Autocomplete`:

```tsx
<Field.Autocomplete
  name="contact_id"
  label="Kontak"
  options={contactsQuery.data}
  getOptionLabel={(opt) => opt.name}
  renderOption={(props, opt) => (
    <li {...props} key={opt.id}>
      {opt.name} ({opt.type})
    </li>
  )}
/>
```

## Error display

Validation error otomatis tampil di `helperText` dari field — tidak perlu manual. Error submit pakai Alert di atas form:

```tsx
{errorMsg && <Alert severity="error">{errorMsg}</Alert>}
```

## Jangan

- ❌ `Field.Text type="number"` untuk currency/amount — tidak format ribuan
- ❌ Native `<input type="date">` — inconsistent across browsers
- ❌ Hardcode options di `<Select>` untuk reference data — selalu via cached hook
- ❌ Hardcode label/placeholder/validation message — semua via `t()`; Zod pakai `makeSchema(t)` factory
