import type { ApiLocale } from './client';

import { z } from 'zod';

import { apiFetch } from './client';
import { endpoints } from './endpoints';

// ----------------------------------------------------------------------
// Schemas — mirror marketplace-be/docs/api-contract/marketplace/faq.md.
// The public endpoint returns a NESTED tree (max 4 levels); Q&A items only
// live on leaf nodes, branch nodes carry `children`.

const faqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
});

type RawFaqNode = {
  key: string;
  title: string;
  items?: z.infer<typeof faqItemSchema>[] | null;
  children?: RawFaqNode[] | null;
};

const faqNodeSchema: z.ZodType<RawFaqNode> = z.lazy(() =>
  z.object({
    key: z.string(),
    title: z.string(),
    items: z.array(faqItemSchema).nullish(),
    children: z.array(faqNodeSchema).nullish(),
  })
);

export type FaqEntry = { question: string; answer: string };
export type FaqGroup = { key: string; title: string; entries: FaqEntry[] };

// ----------------------------------------------------------------------

/**
 * Depth-first flatten: every leaf node that carries items becomes one group,
 * in tree order. Marketing surfaces (home) don't need the full hierarchy —
 * they need ordered groups of Q&A.
 */
function flattenFaqTree(nodes: RawFaqNode[], groups: FaqGroup[] = []): FaqGroup[] {
  for (const node of nodes) {
    const items = node.items ?? [];

    if (items.length) {
      groups.push({
        key: node.key,
        title: node.title,
        entries: items.map((item) => ({ question: item.q, answer: item.a })),
      });
    }

    flattenFaqTree(node.children ?? [], groups);
  }

  return groups;
}

export const FAQ_TAG = 'faq';

export async function getFaqGroups(locale: ApiLocale = 'id'): Promise<FaqGroup[]> {
  const { data } = await apiFetch<unknown>(endpoints.faq.list, {
    params: { locale },
    next: { revalidate: 300, tags: [FAQ_TAG] },
  });

  const nodes = z
    .array(faqNodeSchema)
    .nullish()
    .transform((value) => value ?? [])
    .parse(data);

  return flattenFaqTree(nodes);
}
