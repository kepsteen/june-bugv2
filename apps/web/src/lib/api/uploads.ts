import { request } from './client';

export const uploadsApi = {
  getPresignedUrl: (data: { payload: { filename: string; contentType: string } }) =>
    request<{ data: { url: string; key: string } }>('/api/uploads/presigned-url', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
  complete: (data: { payload: { key: string } }) =>
    request<{ data: { publicUrl: string } }>('/api/uploads/complete', {
      method: 'POST',
      body: JSON.stringify(data.payload),
    }),
};
