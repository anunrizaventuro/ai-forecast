import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/shared/config';

import { SpkDetailView } from '../views/spk-detail-view';

// ----------------------------------------------------------------------

const metadata = { title: `Detail SPK - ${CONFIG.appName}` };

export default function Page() {
  const { id = '' } = useParams();

  return (
    <>
      <title>{metadata.title}</title>
      <SpkDetailView id={Number(id) || 0} />
    </>
  );
}
