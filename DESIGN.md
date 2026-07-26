# DESIGN.md: IzinSiswa: Aplikasi Perizinan Digital

## Brand & Visual Identity
IzinSiswa's brand identity is built on professionalism, trustworthiness, and efficiency. The visual direction will be clean, modern, and formal, reflecting the serious nature of school administration while ensuring an intuitive and user-friendly experience for parents. The design aims to instill confidence and simplify the digital leave request process.

## User Experience Goals
1.  **Efficient Submission:** Parents/Guardians can successfully submit a complete leave request, including document upload and selfie verification, within 2 minutes.
2.  **Clear Status Communication:** Both Parents/Guardians and School Administrators can ascertain the current status of any leave request (Pending, Approved, Rejected) within 3 seconds of viewing the relevant screen.
3.  **Streamlined Administration:** School Administrators can review, approve, or reject a pending leave request with all necessary information (student details, document, selfie) within 3 clicks/taps.

## Color Palette
The color palette is designed to be professional, clear, and accessible, aligning with the formal nature of school communications.

```css
:root {
  --color-primary: #2C3E50; /* Deep Navy: Professional, Trustworthy */
  --color-secondary: #3498DB; /* Sky Blue: Approachable, Clear */
  --color-accent-success: #2ECC71; /* Emerald Green: Approval, Success */
  --color-accent-danger: #E74C3C; /* Alizarin Red: Rejection, Warning */
  --color-neutral-light: #ECF0F1; /* Cloud Gray: Backgrounds, Dividers */
  --color-neutral-medium: #BDC3C7; /* Silver: Borders, Secondary Text */
  --color-neutral-dark: #34495E; /* Wet Asphalt: Primary Text */
  --color-white: #FFFFFF; /* Pure White: Cards, Surfaces */
}
```

## Typography
A clean, modern sans-serif typeface will be used to ensure readability and a professional aesthetic across all devices.

*   **Font Family:** 'Poppins' (Primary), 'Inter' (Secondary/Fallback)
    *   Google Fonts: [Poppins](https://fonts.google.com/specimen/Poppins), [Inter](https://fonts.google.com/specimen/Inter)
*   **Font Size Scale (Base 16px):**
    *   `xs`: 12px (0.75rem) - Captions, small labels
    *   `sm`: 14px (0.875rem) - Secondary text, form labels
    *   `md`: 16px (1rem) - Body text, standard input
    *   `lg`: 18px (1.125rem) - Subheadings, prominent text
    *   `xl`: 24px (1.5rem) - Section titles
    *   `2xl`: 32px (2rem) - Page titles
*   **Font Weights:** Light (300), Regular (400), Medium (500), Semi-bold (600), Bold (700)

## UI Components & Spacing
A consistent design system will be applied using a modular grid and standardized components for a cohesive user experience.

*   **Grid Unit:** 8px (All spacing and sizing will be multiples of 8px for mobile-first consistency).
*   **Border-Radius Scale:**
    *   `radius-sm`: 4px (Subtle rounding for inputs, buttons)
    *   `radius-md`: 8px (Standard card corners, larger elements)
    *   `radius-lg`: 16px (Prominent elements, modal corners)
*   **Standard Spacing Values:**
    *   `spacing-xs`: 8px
    *   `spacing-sm`: 16px
    *   `spacing-md`: 24px
    *   `spacing-lg`: 32px
    *   `spacing-xl`: 48px

## Screen Priorities
The following screens are critical for each user role and will receive primary design and development focus.

### Parent/Guardian (Public, No Login)
1.  **Student Search Screen:** Landing page with a single search field for the student's full name or NIS.
2.  **Student Confirmation Screen:** Displays matching student(s) (name, class, photo) for the parent to confirm before continuing.
3.  **New Leave Request Form:** Multi-step form for the confirmed student — submitter's name and WhatsApp number, leave type, dates, uploading document, and capturing selfie.
4.  **Submission Success / Ticket Screen:** Displays the generated ticket code and shareable status link, with clear instructions to save it.
5.  **Track Request Status Screen:** Field to enter a ticket code and view that request's current status and (if rejected) the reason.

### Admin
1.  **Login Screen:** Secure authentication for administrators.
2.  **Admin Dashboard:** Centralized view of all pending leave requests, with filtering options.
3.  **Request Detail View:** Comprehensive view of a specific request, including student info, parent details, uploaded document, and verification selfie, with "Approve" and "Reject" actions.
4.  **Student Management:** Interface for CRUD operations on student records, including parent/guardian contact fields.
5.  **Bulk Upload Siswa (Excel):** Screen to download the `.xlsx` template (NIS, Nama Lengkap, Tingkat, Kelas), upload a filled copy, and review the per-row import summary (success/failure with reasons).

## Interaction & Motion
Interactions will be subtle, purposeful, and enhance usability without being distracting.

*   **Hover States (where applicable, e.g., desktop browsers for both the Parent-facing app and the Admin portal):**
    *   Buttons: Slight background color change, subtle lift (shadow increase).
    *   List Items: Light background highlight.
*   **Transitions:**
    *   Duration: `150ms` to `300ms` for most UI element state changes.
    *   Easing: `ease-in-out` for smooth, natural motion.
*   **Animations:** Minimal, primarily for loading indicators, form submission feedback, and in-app notifications.

## Accessibility
Adherence to accessibility standards ensures the application is usable by the widest possible audience.

*   **Contrast Ratios:** All text and essential UI components will meet WCAG 2.1 AA standards (minimum 4.5:1 for normal text, 3:1 for large text and graphical objects).
*   **Keyboard Navigation:**
    *   All interactive elements (buttons, links, form fields) will be reachable and operable via keyboard.
    *   Clear visual focus indicators will be provided for all interactive elements.
    *   Logical tab order will be maintained throughout the application.
*   **Semantic HTML/ARIA Roles:** Appropriate semantic elements and ARIA roles will be used to convey structure and meaning to assistive technologies.
*   **Scalable Text:** Text will be designed to scale without loss of content or functionality when users adjust font sizes.