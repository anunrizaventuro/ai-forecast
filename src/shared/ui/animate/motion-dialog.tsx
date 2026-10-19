import type { Variants } from 'framer-motion';
import type { PaperProps } from '@mui/material/Paper';
import type { DialogProps } from '@mui/material/Dialog';

import { m, AnimatePresence } from 'framer-motion';

import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';

import { varFade, varBounce } from './variants';

// ----------------------------------------------------------------------
// Drop-in replacement for MUI `<Dialog>` that animates Paper via framer-motion.
// Pattern adopted from Minimals skeleton (sections/_examples/animate-view/dialog):
//
//   1. <AnimatePresence> wraps the Dialog so framer-motion can detain its
//      subtree while the exit animation runs.
//   2. `{open && <Dialog>}` — on close, Dialog leaves the tree; AnimatePresence
//      keeps it mounted until the motion.div Paper completes its exit.
//   3. `PaperComponent` renders Paper with `component={m.div}` and spreads
//      the variant object (initial/animate/exit) — so Paper IS the motion
//      element. No wrapper div, no layout break.
//
// IMPORTANT: PaperComponent MUST be a stable reference per variant (module
// scope, not recreated per render). If the reference changes between renders,
// MUI Dialog treats it as a new component type and REMOUNTS Paper — which
// retriggers the enter animation mid-flight and visually looks like the
// dialog closes and reopens when data arrives.

export type MotionDialogVariant = 'fadeInUp' | 'bounceInUp';

// Default: fadeInUp — subtle slide + fade. Used for form/detail dialogs.
const fadeInUpVariants: Variants = varFade('inUp', {
  transitionIn: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  transitionOut: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
});

// bounceInUp — playful pop used for alert/confirm dialogs (delete, reject).
// varBounce only defines `animate` keyframes; we compose a simple exit so the
// close animation still plays.
const bounceInUpVariants: Variants = {
  ...varBounce('inUp', {}),
  exit: {},
};

function makePaperComponent(variants: Variants) {
  return function MotionPaper(props: PaperProps) {
    return (
      <Paper component={m.div as never} {...variants} {...props}>
        {props.children}
      </Paper>
    );
  };
}

const PAPER_BY_VARIANT: Record<MotionDialogVariant, React.FC<PaperProps>> = {
  fadeInUp: makePaperComponent(fadeInUpVariants),
  bounceInUp: makePaperComponent(bounceInUpVariants),
};

type MotionDialogProps = DialogProps & {
  motionVariant?: MotionDialogVariant;
};

export function MotionDialog({
  open,
  children,
  motionVariant = 'fadeInUp',
  ...rest
}: MotionDialogProps) {
  const PaperComponent = PAPER_BY_VARIANT[motionVariant];

  return (
    <AnimatePresence>
      {open ? (
        <Dialog open PaperComponent={PaperComponent} {...rest}>
          {children}
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
}
