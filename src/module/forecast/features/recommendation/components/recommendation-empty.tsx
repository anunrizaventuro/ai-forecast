import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function RecommendationEmpty({ text }: { text?: string }) {
  return (
    <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
      <Typography variant="subtitle1">Tidak ada data</Typography>
      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
        {text ?? 'Coba ubah atau reset filter.'}
      </Typography>
    </Box>
  );
}
