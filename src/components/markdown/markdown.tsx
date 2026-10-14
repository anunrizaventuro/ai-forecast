'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

import { MarkdownRoot } from './styles';

// ----------------------------------------------------------------------
// Article bodies arrive from the backend as raw HTML (BlockNote output) and
// the API contract makes sanitization the consumer's responsibility — this
// component is the single injection point, so everything rendered through it
// is sanitized here. DOMPurify's default allowlist already covers article
// media (img, video, audio, source, figure, tables…); iframes stay forbidden.

// Registered once at module scope (hooks are global to the DOMPurify instance).
// Official DOMPurify pattern: force target="_blank" + rel to prevent tabnabbing.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'controls', 'poster', 'preload'],
  // Article bodies never legitimately contain forms (phishing-form injection
  // on a trusted origin) or inline styles (full-viewport overlay/UI-redress).
  FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'option'],
  FORBID_ATTR: ['style'],
};

export type MarkdownProps = React.ComponentProps<typeof MarkdownRoot> & {
  content: string;
  firstLetter?: boolean;
};

export function Markdown({ content, firstLetter = false, ...other }: MarkdownProps) {
  const sanitized = useMemo(() => DOMPurify.sanitize(content, SANITIZE_CONFIG), [content]);

  return (
    <MarkdownRoot
      firstLetter={firstLetter}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...other}
    />
  );
}
