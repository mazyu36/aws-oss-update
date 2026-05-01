import { defineCollection, z } from 'astro:content';

const releases = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    version: z.string(),
    repository: z.enum(['sdk-python', 'sdk-typescript', 'tools', 'agentcore-python', 'agentcore-typescript', 'cdk']),
    repositoryDisplayName: z.string(),
    releaseType: z.enum(['stable', 'prerelease', 'alpha']),
    date: z.coerce.date(),
    summary: z.string(),
    releaseUrl: z.string().url().optional(),
  }),
});

export const collections = { releases };
