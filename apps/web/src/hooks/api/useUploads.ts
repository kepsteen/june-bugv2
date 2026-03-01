import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { uploadsApi } from '@/lib/api';

type PresignedUrlVariables = { payload: { filename: string; contentType: string } };
type PresignedUrlResponse = { data: { url: string; key: string } };
type CompleteUploadVariables = { payload: { key: string } };
type CompleteUploadResponse = { data: { publicUrl: string } };

/**
 * Mutation hook to get a presigned URL for file upload
 */
export function useGetPresignedUrlMutation(
  options?: Omit<UseMutationOptions<PresignedUrlResponse, Error, PresignedUrlVariables, unknown>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (variables: PresignedUrlVariables) => uploadsApi.getPresignedUrl(variables),
    ...options,
  });
}

/**
 * Mutation hook to complete an upload
 */
export function useCompleteUploadMutation(
  options?: Omit<UseMutationOptions<CompleteUploadResponse, Error, CompleteUploadVariables, unknown>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (variables: CompleteUploadVariables) => uploadsApi.complete(variables),
    ...options,
  });
}
