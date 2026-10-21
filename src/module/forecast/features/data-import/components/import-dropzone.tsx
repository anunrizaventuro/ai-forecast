import type { ImportKind } from '../api';

import { useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';

import { AUTO_FORMATS } from './import-labels';

// ----------------------------------------------------------------------
// Area unggah (seret-lepas atau pilih file). Tanpa jenis data (kind null)
// backend mengenali file dari isinya; daftar file yang dikenali ditampilkan.
// Dengan jenis manual, format & kolom jenis itu yang ditampilkan. Validasi
// isi file dilakukan backend.

const ACCEPT = '.xlsx,.csv';
const MAX_MB = 10;

type Props = {
  kind: ImportKind | null;
  uploading: boolean;
  progress: number;
  onFile: (file: File) => void;
};

export function ImportDropzone({ kind, uploading, progress, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.split(',').includes(ext)) {
      setLocalError('Format file tidak didukung. Gunakan file .xlsx atau .csv.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Ukuran file melebihi ${MAX_MB} MB.`);
      return;
    }
    setLocalError(null);
    onFile(file);
  };

  return (
    <div>
      <Box
        role="button"
        tabIndex={0}
        aria-label={kind ? `Unggah file ${kind.label}` : 'Unggah file dari klien'}
        aria-disabled={uploading}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!uploading && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!uploading) pick(event.dataTransfer.files[0]);
        }}
        sx={(theme) => ({
          p: { xs: 3, md: 5 },
          gap: 1,
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          borderRadius: 1.5,
          cursor: uploading ? 'progress' : 'pointer',
          border: `dashed 1px ${theme.vars.palette.divider}`,
          bgcolor: dragging ? 'action.hover' : 'background.neutral',
          transition: theme.transitions.create(['background-color', 'border-color']),
          ...(dragging && { borderColor: 'primary.main' }),
          '&:focus-visible': { outline: `2px solid ${theme.vars.palette.primary.main}` },
        })}
      >
        <Iconify icon="eva:cloud-upload-fill" width={40} sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle1">
          {uploading ? 'Memeriksa file…' : `Seret file ${kind ? kind.label : 'dari klien'} ke sini`}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          atau{' '}
          <Box component="span" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
            pilih file
          </Box>{' '}
          · .xlsx atau .csv, maksimal {MAX_MB} MB
        </Typography>
        {uploading && (
          <LinearProgress
            variant={progress < 100 ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{ mt: 1, width: 1, maxWidth: 320 }}
          />
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(event) => {
            pick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </Box>

      {localError && (
        <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
          {localError}
        </Typography>
      )}

      {kind ? <KindFormat kind={kind} /> : <AutoFormats />}
    </div>
  );
}

// ----------------------------------------------------------------------

function AutoFormats() {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
        Jenis data dikenali otomatis dari isi file:
      </Typography>
      <Box
        sx={{
          gap: 1.5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        }}
      >
        {AUTO_FORMATS.map((item) => (
          <Box key={item.label} sx={{ gap: 1.5, display: 'flex', alignItems: 'flex-start' }}>
            <Iconify icon={item.icon} width={22} sx={{ mt: 0.25, color: 'primary.main' }} />
            <div>
              <Typography variant="subtitle2">{item.label}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {item.hint}
              </Typography>
            </div>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function KindFormat({ kind }: { kind: ImportKind }) {
  return (
    <Box sx={{ mt: 2, gap: 1, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        <strong>Format:</strong> {kind.formats}
      </Typography>
      {kind.required.length > 0 && (
        <Box sx={{ gap: 0.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            Kolom wajib:
          </Typography>
          {kind.required.map((col) => (
            <Label key={col} color="primary" variant="soft">
              {col}
            </Label>
          ))}
          {kind.optional.length > 0 && (
            <>
              <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1, mr: 0.5 }}>
                Opsional:
              </Typography>
              {kind.optional.map((col) => (
                <Label key={col} variant="soft">
                  {col}
                </Label>
              ))}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
