import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';

// ----------------------------------------------------------------------
// Status muat data API: error dengan tombol coba lagi, atau garis progres
// tipis saat mengambil ulang (data lama tetap tampil — tanpa lompatan layout).

type Props = {
  error?: Error | null;
  fetching?: boolean;
  onRetry?: () => void;
};

export function ForecastDataState({ error, fetching, onRetry }: Props) {
  if (error) {
    return (
      <Alert
        severity="error"
        variant="outlined"
        sx={{ mb: 3 }}
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              Coba lagi
            </Button>
          )
        }
      >
        Gagal memuat data dari backend AI Forecast: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ height: 2, mb: 1, mt: -1.5 }}>
      {fetching && <LinearProgress sx={{ height: 2, borderRadius: 1 }} />}
    </Box>
  );
}
