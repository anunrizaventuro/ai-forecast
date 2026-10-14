import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function ForecastPageHeader({ title, description, action }: Props) {
  return (
    <Box
      sx={{
        mb: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 760 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
