import { AnimatePresence, motion } from 'framer-motion';
import { Check, CircleNotch, Info } from '@phosphor-icons/react';

// A bar that carries a form through saving: "Unsaved changes" with a quiet button to leave or reset and a green one to save,
// then a spinner while it saves, then a tick once it is done. The buttons spring in and out as the state changes.
// Made after the toast-save component, in the app's own colours (ink, paper and ledger green).
//   state: 'initial' | 'loading' | 'success'    text: what the pill says at rest    onReset, resetText: the quiet button (leave it out to hide it)
//   onSave, saveText: the green button; with saveType="submit" and form="id" it submits a form    saveDisabled: dim the green button
const spring = { type: 'spring', stiffness: 500, damping: 30, mass: 1 };

export default function SaveToast({
  state = 'initial', text = 'Unsaved changes', loadingText = 'Saving', successText = 'Saved',
  onReset, resetText = 'Reset', onSave, saveText = 'Save', saveType = 'button', form, saveDisabled = false, resetDisabled = false, className = '',
}) {
  return (
    <motion.div
      role="group"
      aria-label="Save"
      className={`flex h-14 w-full items-center justify-between gap-2 overflow-hidden ${className}`}
    >
      <div className="flex h-full min-w-0 items-center pl-4" role="status" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[0.9375rem] font-medium text-ink"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {state === 'loading' && (<><CircleNotch size={18} weight="bold" aria-hidden="true" className="shrink-0 animate-spin text-muted" />{loadingText}</>)}
            {state === 'success' && (
              <>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong"><Check size={12} weight="bold" aria-hidden="true" /></span>
                {successText}
              </>
            )}
            {state === 'initial' && (<><Info size={18} aria-hidden="true" className="shrink-0 text-muted" /><span className="truncate">{text}</span></>)}
          </motion.span>
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {state === 'initial' && (
          <motion.div
            className="flex items-center gap-1.5 pr-2"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ ...spring, opacity: { duration: 0.1 } }}
          >
            {onReset && (
              <button type="button" className="btn btn-sm btn-quiet shrink-0 px-3" onClick={onReset} disabled={resetDisabled}>{resetText}</button>
            )}
            <button type={saveType} form={form} className="btn btn-sm btn-primary shrink-0 px-4" onClick={saveType === 'submit' ? undefined : onSave} disabled={saveDisabled}>{saveText}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
