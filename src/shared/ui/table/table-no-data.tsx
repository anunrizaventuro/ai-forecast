import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type TableNoDataProps = {
  notFound: boolean;
  colSpan?: number;
  sx?: SxProps<Theme>;
  message?: string;
  children?: React.ReactNode;
};

export function TableNoData({
  notFound,
  colSpan = 12,
  sx,
  message = 'No data',
  children,
}: TableNoDataProps) {
  return (
    <TableRow>
      {notFound ? (
        <TableCell colSpan={colSpan}>
          {children ?? (
            <Box sx={[{ py: 10, textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}>
              <Typography variant="h6">{message}</Typography>
            </Box>
          )}
        </TableCell>
      ) : (
        <TableCell colSpan={colSpan} sx={{ p: 0 }} />
      )}
    </TableRow>
  );
}
