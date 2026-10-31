import { Check, X } from '@phosphor-icons/react';

// The one on or off switch, used everywhere. It is the control only (put it inside a <label> with its words) and a real checkbox
// underneath, so keyboard, screen readers and forms work as usual. Material Design 3 shape: a round track, a small handle when off
// that grows when on and swells while pressed (16, 24 and 28px), a soft halo under it on hover and press, and a springy slide.
// The look is in globals.css (.sw). size 'md' is 52 x 32, 'sm' is 40 x 24 (inside a button or a row of chips).
// icons: a symbol on the handle, a tick when on and a cross when off, or OnIcon and OffIcon (Phosphor components) of your own, like an eye.
export default function Switch({ checked, onChange, size = 'md', icons = false, OnIcon = Check, OffIcon = X, disabled, ...rest }) {
  const small = size === 'sm';
  const iconSize = small ? 10 : 14;
  return (
    <span className={`sw ${small ? 'sw-sm' : ''} relative inline-flex shrink-0 ${small ? '' : 'min-h-12 min-w-12 items-center justify-center'}`}>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} {...rest} />
      <span aria-hidden="true" className="sw-track">
        <span className="sw-handle">
          {icons && (
            <>
              <OffIcon size={iconSize} weight="bold" className="sw-off" />
              <OnIcon size={iconSize} weight="bold" className="sw-on" />
            </>
          )}
        </span>
      </span>
    </span>
  );
}
