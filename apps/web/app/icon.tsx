import { ImageResponse } from 'next/og';
import { SiSui } from 'react-icons/si';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#4c32ff',
          borderRadius: '50%',
        }}
      >
        <SiSui style={{ color: 'white', width: '20px', height: '20px' }} />
      </div>
    ),
    {
      ...size,
    }
  );
}
