# USERFLOW.md: IzinSiswa: Aplikasi Perizinan Digital

This document outlines the primary user flows within the IzinSiswa application, detailing the step-by-step interactions between users and the system. It focuses on the most critical and unique journeys, providing a clear understanding of the application's core functionality.

## 1. Parent/Guardian Submits Leave Request

This flow describes how a Parent/Guardian — with no account or login — finds their child via the public web app and submits a leave request, including the mandatory document upload and real-time selfie verification.

| No | Actor | Action/Step | System Response | Alternative/Alternative Path/Error Path |
|:---|:---|:---|:---|:---|
| 1 | Parent/Guardian | Opens the IzinSiswa web app and enters the student's full name or NIS in the search field. | System queries active students matching the query and displays the results. | No matching student: System displays "Siswa tidak ditemukan. Periksa kembali nama atau NIS, atau hubungi admin sekolah." |
| 2 | Parent/Guardian | Reviews the search results and taps/clicks the correct student to confirm. | System navigates to the "New Leave Request" form, pre-filled and locked to the confirmed student's identity. | Wrong student shown: Parent/Guardian taps "Cari lagi" to return to the search step. |
| 3 | Parent/Guardian | Enters their own name and WhatsApp number as the submitter's contact for this request. | Form validates both fields are non-empty and the WhatsApp number has a plausible format. | Missing/invalid contact: System displays "Mohon lengkapi nama dan nomor WhatsApp orang tua/wali." |
| 4 | Parent/Guardian | Fills out the leave request form: selects leave type (e.g., `Sakit`, `Keadaan Darurat Keluarga`, `Izin`), specifies start and end dates. | Form fields are updated. Date picker ensures valid date range (start date <= end date, no past dates). | Invalid date selection: System displays validation error "End date cannot be before start date" or "Cannot request leave for past dates." |
| 5 | Parent/Guardian | Clicks "Upload Document" and selects a file (PDF, JPG, PNG) from their device. | System displays a file picker. Upon selection, the file is temporarily uploaded and a preview/filename is shown. | File type not supported: System displays error "Unsupported file type. Please upload PDF, JPG, or PNG." File size exceeds 5MB: System displays error "File size exceeds 5MB limit." |
| 6 | Parent/Guardian | Clicks "Take Selfie for Verification." | System activates the device/browser camera via a permission prompt. | Camera access denied: System prompts user to grant camera permissions and explains it is required to submit. |
| 7 | Parent/Guardian | Captures a real-time selfie using the camera. | System captures the image, displays a preview, and attaches it to the request. Prevents selection from gallery/file system. | User cancels selfie: System returns to form, selfie field remains empty. |
| 8 | Parent/Guardian | Reviews all entered information and clicks "Submit Request." | System validates all mandatory fields. If valid, it creates a new `LeaveRequest` record with `Pending` status, stores the submitter's name/WhatsApp number, the document and selfie in AWS S3, generates a unique ticket code, and shows it on a confirmation screen. | Mandatory fields missing: System highlights missing fields with error messages. Network error during submission: System displays "Submission failed. Please check your internet connection and try again." |
| 9 | System | Displays the ticket code and a shareable status-check link on the confirmation screen. | Parent/Guardian is instructed to save the ticket code/link, since there is no account or history log otherwise available to them. | N/A |

**Trigger**: A Parent/Guardian needs to formally request a student's absence from school.
**Pre-conditions**: The student is already registered by the school Admin (with a valid NIS). No parent account or login is required. The device has a functional camera and internet connectivity.
**Post-conditions**: A new leave request is successfully created in the system with a `Pending` status, including all submitted details, supporting documents, a real-time verification selfie, and a unique ticket code for later status tracking.

## 2. Parent/Guardian Tracks Request Status via Ticket Code

This flow describes how a Parent/Guardian checks the status of a previously submitted leave request using the ticket code received at submission time, without needing to log in.

| No | Actor | Action/Step | System Response | Alternative/Alternative Path/Error Path |
|:---|:---|:---|:---|:---|
| 1 | Parent/Guardian | Opens the "Track Request" page (or follows the status link received at submission). | System displays a field to enter a ticket code. | N/A |
| 2 | Parent/Guardian | Enters the ticket code and submits. | System looks up the matching `LeaveRequest` and displays the student's name, leave type, date range, submission date, and current status (`Pending`, `Approved`, or `Rejected`). | Invalid/unknown ticket code: System displays "Kode tiket tidak ditemukan. Periksa kembali kode Anda." |
| 3 | Parent/Guardian | Reviews the status. If `Rejected`, reads the rejection reason. | System displays the Admin's rejection reason, if provided. | N/A |

**Trigger**: A Parent/Guardian wants to know whether a submitted request has been approved or rejected.
**Pre-conditions**: The Parent/Guardian has a valid ticket code from a prior submission.
**Post-conditions**: The current status and (if applicable) rejection reason are shown; no data is modified.

## 3. Admin Reviews and Adjudicates Leave Request

This flow details how a School Administrator accesses, reviews, and makes a decision (Approve/Reject) on a submitted leave request.

| No | Actor | Action/Step | System Response | Alternative/Alternative Path/Error Path |
|:---|:---|:---|:---|:---|
| 1 | Admin | Logs into the web-based Admin Dashboard. | System authenticates user and displays the Admin Dashboard, typically showing a summary of pending requests. | Invalid credentials: System displays error message "Invalid username or password." |
| 2 | Admin | Navigates to the "Leave Requests" section and filters for `Pending` requests. | System displays a sortable and filterable list of all leave requests, highlighting those with `Pending` status. | No pending requests: System displays "No pending leave requests." |
| 3 | Admin | Clicks on a specific `Pending` leave request from the list. | System opens a detailed view of the selected request, displaying student details, leave dates, leave type, uploaded document (viewable in-browser), and parent's verification selfie. | Request already processed: System displays the request in read-only mode with its final status (`Approved`/`Rejected`). |
| 4 | Admin | Reviews the request details, supporting document, and verification selfie. | Admin evaluates the legitimacy and completeness of the request. | Document/Selfie not loading: System displays a placeholder or error message, potentially due to S3 access issues or corrupted files. |
| 5 | Admin | Decides to "Approve" the request. | System updates the `LeaveRequest` status to `Approved` in the database. | Admin accidentally clicks "Reject": System may prompt for confirmation before proceeding. |
| 6 | Admin | Decides to "Reject" the request and optionally provides a reason. | System prompts for an optional rejection reason (text input). Upon confirmation, it updates the `LeaveRequest` status to `Rejected` and stores the reason. | Admin rejects without reason: System allows rejection, but the reason field remains empty. |
| 7 | System | Makes the new status immediately visible to anyone checking the request via its ticket code. | The Parent/Guardian who holds the ticket code can see the updated status (Approved/Rejected) and any rejection reason the next time they check. | N/A (no push notification is sent — the Parent/Guardian must check the ticket status page). |
| 8 | System | Updates the Admin Dashboard to reflect the new status of the adjudicated request. | The request is removed from the `Pending` filter view and appears with its new status in other filtered views. |

**Trigger**: An Admin needs to process a student leave request.
**Pre-conditions**: The Admin has a registered account, is logged into the web dashboard, and there are pending leave requests available for review.
**Post-conditions**: The leave request's status is updated to either `Approved` or `Rejected` in the system. If rejected, the reason is recorded and becomes visible on the ticket status page.

## 4. Admin Manages Student Records

This flow describes how a School Administrator performs CRUD (Create, Read, Update, Deactivate) operations on student records, including the parent/guardian contact information stored directly on each record.

| No | Actor | Action/Step | System Response | Alternative/Alternative Path/Error Path |
|:---|:---|:---|:---|:---|
| 1 | Admin | Logs into the web-based Admin Dashboard. | System authenticates user and displays the Admin Dashboard. | Invalid credentials: System displays error message "Invalid username or password." |
| 2 | Admin | Navigates to the "Student Management" section. | System displays a list of all registered students, with options to search, filter, add new, or edit existing students. | No students registered: System displays "No student records found. Click 'Add New Student' to begin." |
| 3 | Admin | To add a new student: Clicks "Add New Student" button. | System presents a form for entering new student details (NIS, Name, Class, Date of Birth) plus Parent/Guardian Name and Phone Number. | Admin cancels: System returns to student list without saving. |
| 4 | Admin | Fills in student and parent/guardian contact details and clicks "Save." | System validates input. If valid, it creates a new `Student` record with the parent/guardian contact fields stored directly on it (no separate account is created). | Missing mandatory fields: System highlights missing fields with error messages. Duplicate NIS: System displays "NIS sudah terdaftar." |
| 5 | Admin | To edit an existing student: Selects a student from the list and clicks "Edit." | System populates an editable form with the selected student's current details, including parent/guardian contact info. | Student not found: System displays "Student record not found." |
| 6 | Admin | Modifies student or parent/guardian contact details and clicks "Save Changes." | System validates input. If valid, it updates the `Student` record. | Invalid data: System displays validation errors. |
| 7 | Admin | To deactivate a student: Selects a student and clicks "Deactivate." | System prompts for confirmation for soft deletion. | Admin cancels: System returns to student list, student remains active. |
| 8 | Admin | Confirms deactivation. | System sets the `Student` record's `isActive` flag to `false` (soft delete), making it unavailable in public search and for new leave requests, but retaining historical data. | Error during deactivation: System displays "Failed to deactivate student. Please try again." |
| 9 | System | Updates the student list display to reflect changes (new student, updated details, or deactivated status). | The student list is refreshed, showing the most current student data. |

**Trigger**: School administration needs to manage the student roster, including adding new students, updating their information (or their parent/guardian's contact details), or deactivating records for students who have left the school.
**Pre-conditions**: The Admin has a registered account and is logged into the web dashboard.
**Post-conditions**: Student records — including parent/guardian contact information — are accurately maintained within the system.

## 5. Admin Bulk Uploads Students via Excel Template

This flow describes how a School Administrator registers many students at once by downloading a template, filling it in offline, and uploading it, instead of adding students one by one.

| No | Actor | Action/Step | System Response | Alternative/Alternative Path/Error Path |
|:---|:---|:---|:---|:---|
| 1 | Admin | Navigates to "Student Management" and clicks "Download Template." | System downloads an `.xlsx` file with the header row `NIS`, `Nama Lengkap`, `Tingkat`, `Kelas`. | N/A |
| 2 | Admin | Fills in one row per student in the downloaded Excel file, outside the application. | N/A (offline step). | N/A |
| 3 | Admin | Returns to "Student Management," clicks "Upload Siswa," and selects the completed `.xlsx` file. | System uploads the file for processing. | Wrong file type/too large: System displays "File harus berformat .xlsx dan maksimal 2MB." |
| 4 | System | Validates the file's headers and every data row (required fields present, NIS unique within the file and against existing students). | System creates a new `Student` record for each valid row, leaving parent/guardian contact fields empty. | Header mismatch: System rejects the whole file with "Format file tidak sesuai template." |
| 5 | System | Displays an import summary: total rows, rows created successfully, and rows that failed with the reason for each (e.g., "Baris 12: NIS sudah terdaftar."). | Admin reviews the summary. Successfully imported rows are immediately visible in the student list. | All rows fail: System displays "Tidak ada data yang berhasil diimpor. Periksa kembali file Anda." |
| 6 | Admin | For any failed rows, corrects the data in the Excel file and re-uploads (repeats from step 3), or adds those students manually. | System processes the corrected file the same way, only creating the previously-failed students. | N/A |
| 7 | Admin | Opens each newly imported student's record later to fill in Parent/Guardian Name and Phone Number. | System updates the `Student` record with the completed contact information. | N/A |

**Trigger**: School administration has a list of many students (e.g., a new intake or semester roster) to register at once instead of one at a time.
**Pre-conditions**: The Admin is logged into the web dashboard and has the student data (NIS, name, grade, class) ready in spreadsheet form.
**Post-conditions**: All valid rows from the uploaded file exist as active `Student` records, searchable by parents via name/NIS; failed rows are reported for correction and are not silently dropped. Parent/guardian contact fields remain empty until completed separately.