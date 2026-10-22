/**
 * Classes that turn an editable lines table into one card per line on phones (below md): the header row hides and each
 * cell shows its own label from `data-label`. On wider screens it is an ordinary table.
 */
export const stack = {
  table: "w-full text-sm max-md:block",
  head: "border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500 max-md:hidden",
  body: "divide-y divide-stone-100 max-md:block",
  row: "max-md:grid max-md:grid-cols-2 max-md:items-end max-md:gap-x-3 max-md:gap-y-3 max-md:px-3 max-md:py-4",
  cell: "px-2 py-2 max-md:block max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-xs max-md:before:font-medium max-md:before:text-stone-500 max-md:before:content-[attr(data-label)]",
  /** A cell that takes the card's full width on phones. */
  wide: "max-md:col-span-2",
  /** The amount: a plain figure, left-aligned on phones. */
  amount: "px-3 py-2 text-right font-mono max-md:block max-md:p-0 max-md:text-left max-md:text-base max-md:font-semibold max-md:before:mb-1 max-md:before:block max-md:before:font-sans max-md:before:text-xs max-md:before:font-medium max-md:before:text-stone-500 max-md:before:content-[attr(data-label)]",
  /** The remove button: bottom right of the card on phones. */
  remove: "px-1 max-md:block max-md:p-0 max-md:text-right",
};
