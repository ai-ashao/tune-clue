# UI Control Spacing Contract

ShipLean controls must show clear grouping without allowing labels, inputs, select arrows, icons, or adjacent actions to touch visually. Use shared primitives instead of repairing spacing independently on every route.

## Label and control spacing

- Wrap a label and its input, textarea, or select in `Field`.
- Vertical fields use at least 8px between the label and control (`gap-2`).
- Horizontal fields use at least 16px between label and control (`gap-x-4`) and retain 8px vertical separation when they wrap.
- Separate stacked fields by at least 16px with `FieldGroup` (`gap-4`).
- Group a control and its help/error text with `FieldControl`, especially inside horizontal fields.
- Help text belongs inside the same field but must remain visibly separate from both label and control.
- Do not rely on literal whitespace, line breaks, or incidental margins from surrounding sections.

## Selects and dropdown triggers

- Use the shared `Select` for native select controls. It reserves 40px on the trailing side (`pr-10`) and positions the arrow 12px from the edge (`right-3`).
- Dropdown buttons must keep at least 8px between text and the trailing arrow. The shared `Button` provides this with `gap-2`.
- Do not override shared controls with `gap-0`, remove trailing padding, or absolutely position an arrow over the label.
- Long labels must truncate or wrap without colliding with the arrow.

## Adjacent controls

- Use at least 8px between tightly related controls and at least 12px between distinct actions.
- On narrow screens, allow action rows to wrap or stack while retaining both horizontal and vertical gaps.
- Icon-only controls still require a practical hit target and an accessible name; visual spacing does not replace accessibility.

## Review gate

For new or changed forms, verify at desktop and 390px width that:

1. every visible label is separated from its control;
2. select/dropdown text never touches its arrow;
3. adjacent buttons and controls remain distinct after wrapping;
4. focus rings are not clipped;
5. no control creates horizontal overflow.

`tests/ui-spacing-contract.test.ts` protects the shared baseline. Product-specific layouts still require browser review because static class checks cannot prove visual quality.
