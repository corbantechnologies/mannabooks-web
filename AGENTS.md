<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pop-up (Modal) or page

Use a **Modal** only for a quick, single-purpose step that fits on a laptop screen without scrolling:
- at most 6 fields, in one group (no sections);
- no line items or lists that grow (invoice lines, pay items, resources);
- nothing people fill in over several sittings or come back to edit often;
- examples: confirm or decline with a reason, record a payment, add a note, a project's name and dates, pick a month.

Everything else is a **page** with its own URL (`/new`, `/[id]/edit`): several sections, long forms, line items, anything with
its own Save bar. Pages are also what a phone and the future PWA handle best (a back button, no nested scrolling).
New employee and Change employee follow this (`employees/new`, `employees/[id]/edit`, `components/employee-editor.tsx`).

A form with more than 6 fields that belongs to a list page can stay one component and show as a page: the address says which
form is open (`useFormFlag` / `useFormItem` / `useFormParam` in `lib/page-form.ts`: `?form=new`, `?form=<id>`), and the page
returns `<AsPage><TheForm /></AsPage>` in place of the list. Inside `AsPage` its `<Modal>` draws as a page (heading, card, full
width), so back, refresh and shared links work.

Phone widths: every page must work at 375px with no sideways scrolling of the page itself. Wide tables scroll inside their
card; header buttons wrap (`flex flex-wrap`); money cards are two across until `xl` (`sm:grid-cols-2 xl:grid-cols-4`) and
big figures use `break-words text-xl tabular-nums sm:text-2xl`.

# Full width

Workspace pages fill the content area: the page wrapper is `w-full`, never `mx-auto max-w-*` or `w-full max-w-*`. Use more
grid columns on wide screens (`lg:grid-cols-2`, `2xl:grid-cols-4`) instead of a narrow column with empty space beside it.
Only these keep a width: print and PDF views laid out for A4, the payslip and other document-style views, guide articles (reading
width), modals, and single inputs such as a search box (`max-w-sm`).
