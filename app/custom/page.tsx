// C4BAG fork: converted from an async server component (`await searchParams`)
// to a client component using `useSearchParams`, so the app can be built with
// `output: 'export'` (static HTML deploy, no Node runtime needed).
// Behaviour and rendered output are identical — this wrapper still just
// validates the query string and forwards to <VideoConferenceClientImpl/>.
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { videoCodecs } from 'livekit-client';
import { VideoConferenceClientImpl } from './VideoConferenceClientImpl';
import { isVideoCodec } from '@/lib/types';

function CustomRoomConnectionInner() {
  const searchParams = useSearchParams();
  const liveKitUrl = searchParams.get('liveKitUrl');
  const token = searchParams.get('token');
  const codecParam = searchParams.get('codec');
  const singlePC = searchParams.get('singlePC');

  if (typeof liveKitUrl !== 'string' || liveKitUrl.length === 0) {
    return <h2>Missing LiveKit URL</h2>;
  }
  if (typeof token !== 'string' || token.length === 0) {
    return <h2>Missing LiveKit token</h2>;
  }
  if (codecParam !== null && !isVideoCodec(codecParam)) {
    return <h2>Invalid codec, if defined it has to be [{videoCodecs.join(', ')}].</h2>;
  }
  const codec = codecParam !== null && isVideoCodec(codecParam) ? codecParam : undefined;

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <VideoConferenceClientImpl
        liveKitUrl={liveKitUrl}
        token={token}
        codec={codec}
        singlePeerConnection={singlePC === 'true'}
      />
    </main>
  );
}

export default function CustomRoomConnection() {
  return (
    <Suspense fallback={null}>
      <CustomRoomConnectionInner />
    </Suspense>
  );
}
