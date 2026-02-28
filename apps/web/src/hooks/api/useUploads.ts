import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { uploadsApi } from '@/lib/api';

type PresignedUrlVariables = { filename: string; contentType: string };
type PresignedUrlResponse = { data: { url: string; key: string } };
type CompleteUploadResponse = { data: { publicUrl: string } };

/**
 * Mutation hook to get a presigned URL for file upload
 */
export function useGetPresignedUrlMutation(
  options?: Omit<UseMutationOptions<PresignedUrlResponse, Error, PresignedUrlVariables, unknown>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: ({ filename, contentType }: PresignedUrlVariables) =>
      uploadsApi.getPresignedUrl(filename, contentType),
    ...options,
  });
}

/**
 * Mutation hook to complete an upload
 */
export function useCompleteUploadMutation(
  options?: Omit<UseMutationOptions<CompleteUploadResponse, Error, string, unknown>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (key: string) => uploadsApi.complete(key),
    ...options,
  });
}
