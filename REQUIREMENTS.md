# REQUIREMENTS.md: IzinSiswa: Aplikasi Perizinan Digital

## Functional Requirements

This section details the functional capabilities the IzinSiswa application **MUST** provide, categorized by user role. Each requirement includes specific acceptance criteria that a QA engineer can use for verification. RFC 2119 keywords (MUST, SHALL, SHOULD) are used to denote the criticality of each requirement.

### User-Facing (Parent/Guardian) Functional Requirements

These requirements define the functionalities accessible to Parent/Guardian users. Parent/Guardian users do **not** have accounts, credentials, or a login of any kind — they interact with the system exclusively through the public web app.

*   **FR-01: Student Search**
    *   The system **MUST** allow any visitor to the public web app to search for a student by entering the student's full name or NIS (Nomor Induk Siswa).
    *   *Acceptance Criteria:*
        *   Given a valid, existing NIS, the system SHALL return the exact matching student.
        *   Given a partial or full name, the system SHALL return all reasonably matching, active students (e.g., name contains query, case-insensitive).
        *   Given a query that matches no active student, the system SHALL display an informative message (e.g., "Siswa tidak ditemukan. Periksa kembali nama atau NIS, atau hubungi admin sekolah.").
        *   Deactivated (soft-deleted) students SHALL NOT appear in search results.
        *   Search results SHALL expose only minimal identifying information (name, class/grade, photo if available) — no contact details, addresses, or other sensitive fields.

*   **FR-02: Student Confirmation**
    *   The system **MUST** require the user to explicitly confirm the correct student from the search results before proceeding to the leave request form.
    *   *Acceptance Criteria:*
        *   The system SHALL display each matching student's full name, class/grade, and photo (if available) as a selectable card/row.
        *   Selecting a student SHALL navigate the user directly to the "New Leave Request" form, pre-filled with that student's identity.
        *   The user SHALL be able to go back and search again if the wrong student was shown or selected.

*   **FR-03: Leave Request Initiation**
    *   The Parent/Guardian **MUST** be able to initiate a new leave request for the confirmed student.
    *   *Acceptance Criteria:*
        *   The leave request form SHALL be bound to the single student confirmed in FR-02; no student switching is allowed mid-form without returning to search.
        *   The user **MUST** provide their own full name and WhatsApp number as the submitter's contact for this specific request. Both fields SHALL be mandatory, independent of whatever contact information is already on file for the student. The WhatsApp number field SHALL accept digits only (no letters, spaces, `+`, or symbols) and SHALL be validated as 9 to 12 digits; the input SHALL reject/strip non-numeric characters as the user types.
        *   The user SHALL be presented with a predefined, configurable list of leave types (e.g., "Sick Leave," "Family Emergency," "Personal Appointment," "Bereavement," "Other").
        *   The user SHALL be able to specify a start date and an end date for the leave. The end date **MUST** be on or after the start date.
        *   The system SHALL prevent the selection of dates in the past for new leave requests.
        *   The user **SHOULD** be able to add an optional textual reason or detailed note (up to 500 characters) explaining the leave request.

*   **FR-04: Supporting Document Upload**
    *   The system **MUST** allow the Parent/Guardian to upload a supporting document relevant to the leave request (e.g., doctor's note, official letter).
    *   *Acceptance Criteria:*
        *   The system SHALL accept document formats including PDF, JPG, and PNG. Other formats SHALL be rejected.
        *   The maximum file size for any single uploaded document SHALL be 5 MB. Attempts to upload larger files SHALL result in an error message.
        *   The user SHALL be able to select a file from their device's local storage or cloud storage (e.g., Google Drive, iCloud).
        *   Upon successful upload, a visual indicator (e.g., filename, thumbnail preview) of the uploaded document SHALL be displayed to the user for confirmation.
        *   The system SHALL display a clear error message if the file type is unsupported, the file is corrupted, or the file size exceeds the maximum limit.

*   **FR-05: Real-time Selfie Verification**
    *   The system **MUST** require the Parent/Guardian to capture a real-time selfie using the device's camera as a proof-of-submission and identity verification.
    *   *Acceptance Criteria:*
        *   The application SHALL activate the device's front-facing camera directly within the app for selfie capture.
        *   The application SHALL explicitly disable and prevent the selection of an image from the device's photo gallery for this specific step.
        *   The captured selfie image SHALL be displayed to the user for review and confirmation before the final submission of the request.
        *   The system SHALL securely store the captured selfie image alongside the corresponding leave request.
        *   The system **SHOULD** embed metadata (e.g., capture timestamp, device model, and approximate GPS coordinates if location permissions are granted) into the selfie image file or its associated database record to enhance verification and deter fraud.

*   **FR-06: Ticket Code Generation**
    *   Upon successful submission of a leave request, the system **MUST** generate a unique, hard-to-guess ticket code and display it prominently to the user, along with a shareable status-check link that embeds the code.
    *   *Acceptance Criteria:*
        *   The ticket code SHALL be generated server-side and SHALL uniquely identify exactly one leave request.
        *   The confirmation screen SHALL clearly instruct the user to save the ticket code/link to check status later, since no account or history log is otherwise available to them.
        *   The ticket code SHALL remain valid for the lifetime of the request (no expiry) so it can be used for status checks at any time.

*   **FR-07: Ticket-Based Status Tracking**
    *   The system **MUST** allow anyone with a valid ticket code to view the current status of that specific leave request, without logging in.
    *   *Acceptance Criteria:*
        *   The user SHALL be able to enter a ticket code (or open its status link) on a public "Track Request" page.
        *   The system SHALL display the student's name, leave type, requested date range, submission date, and current status (`Pending`, `Approved`, or `Rejected`).
        *   If the request was rejected, the system SHALL display the rejection reason provided by the Admin, if any.
        *   Given an invalid or unknown ticket code, the system SHALL display an informative error (e.g., "Kode tiket tidak ditemukan.") without revealing whether similar codes exist.
        *   The status page SHALL NOT expose the uploaded document or selfie image to reduce exposure of sensitive files to anyone holding the link; it SHALL show status and basic request details only.

### Admin-Facing Functional Requirements

These requirements define the functionalities accessible to School Administrator users.

*   **FR-08: Admin Authentication & Access Control**
    *   **FR-08.1: Secure Admin Login**
        *   Admins **MUST** log in through a separate, secure web-based interface using their unique administrator credentials.
        *   *Acceptance Criteria:*
            *   Given valid Admin credentials, the Admin SHALL be successfully authenticated and redirected to the Admin dashboard.
            *   Given invalid Admin credentials, the system SHALL display an "Invalid username or password" error message and prevent login.
            *   The Admin login interface SHALL enforce strong password policies (e.g., minimum 8 characters, combination of uppercase, lowercase, numbers, and symbols).
    *   **FR-08.2: Role-Based Access Control (RBAC)**
        *   The system **MUST** strictly enforce role-based access control, ensuring that only users explicitly assigned the 'Admin' role can access Admin-specific functionalities and data.
        *   *Acceptance Criteria:*
            *   A Parent/Guardian user attempting to access any Admin-specific endpoint or interface SHALL receive an "Unauthorized Access" error or be redirected to their own dashboard.
            *   An Admin user SHALL have full access to all functionalities described in the Admin-Facing Functional Requirements.

*   **FR-09: Student & Parent Management (CRUD)**
    *   The Admin **MUST** have a dedicated interface to perform Create, Read, Update, and Deactivate (CRUD) operations on student records, including each student's parent/guardian contact details. Parent/Guardian users do **not** have accounts, so there is no separate Parent/Guardian account management — contact information lives directly on the student record.
    *   *Acceptance Criteria - Student Management:*
        *   Admin SHALL be able to create new student records, including mandatory fields NIS (unique), Full Name, Grade, and Class/Section, Date of Birth; Parent/Guardian Full Name and Phone Number are **optional** at creation time (so records can be created without them, e.g., via bulk import) and Parent/Guardian Email is optional.
        *   Admin SHALL be able to view a paginated list of all registered students, with robust search capabilities (by name, NIS, class) and filtering options.
        *   Admin SHALL be able to update any details of an existing student record, including its parent/guardian contact information.
        *   Admin SHALL be able to deactivate (soft delete) a student record. Deactivated students SHALL no longer appear in public search results or be selectable for new requests, but their historical data SHALL be retained for reporting.
        *   The system SHALL prevent the creation of student records with duplicate NIS.
    *   *Acceptance Criteria - Bulk Student Import (Excel):*
        *   Admin SHALL be able to download a template Excel file (`.xlsx`) from the Student Management screen. The template SHALL contain exactly four columns, in order: `NIS`, `Nama Lengkap`, `Tingkat` (Grade), `Kelas` (Class/Section).
        *   Admin SHALL be able to upload a filled-in copy of the template (`.xlsx`, max e.g. 2MB) to create multiple student records in a single operation.
        *   The system SHALL validate every row before committing any: `NIS` and `Nama Lengkap` are required and non-empty; `NIS` SHALL be unique both within the uploaded file and against existing active student records.
        *   Rows that pass validation SHALL be created as new `Student` records with `parentName`, `parentPhone`, and `parentEmail` left empty (to be completed later by the Admin via the edit form).
        *   Rows that fail validation (missing required field, duplicate NIS in-file, or NIS already registered) SHALL be skipped and reported individually, identified by their row number and the specific reason for failure; valid rows in the same file SHALL still be imported.
        *   Upon completion, the system SHALL display an import summary: total rows processed, number created successfully, and number failed (with a downloadable or on-screen error detail per failed row).
        *   The system SHALL reject the upload outright (with a clear error) if the file is not a valid `.xlsx`, does not match the expected column headers, or exceeds the maximum file size.
        *   The system SHALL support associating more than one parent/guardian contact (e.g., father and mother) with a single student record, where useful.

*   **FR-10: Admin Dashboard & Request Listing**
    *   The Admin dashboard **MUST** display a comprehensive, real-time list of all leave requests submitted to the school.
    *   *Acceptance Criteria:*
        *   The list SHALL display key information for each request: Ticket Code, Student Name, Parent/Guardian Name (as stored on the student record), Leave Type, Requested Date Range, Submission Date/Time, and current Status (`Pending`, `Approved`, `Rejected`).
        *   The dashboard SHALL provide robust filtering capabilities by:
            *   Request Status (`Pending`, `Approved`, `Rejected`).
            *   Date Range (e.g., "Today," "This Week," "This Month," "Custom Range").
            *   Student Name or NIS (search by partial or full name/NIS).
            *   Ticket Code.
            *   Class/Grade.
        *   The list SHALL be sortable by any displayed column (e.g., Submission Date, Student Name, Status).
        *   The dashboard **SHOULD** provide a summary count of requests by status (e.g., "5 Pending Requests," "20 Approved Requests Today") for quick overview.

*   **FR-11: Request Detail View for Admin**
    *   Admins **MUST** be able to click on any request from the list to view its complete details.
    *   *Acceptance Criteria:*
        *   The detail view SHALL display all information provided at submission time: Ticket Code, Student Name, Class, Parent/Guardian Name and Contact Information (from the student record), Leave Type, Start Date, End Date, and the optional Reason/Note.
        *   The detail view SHALL display the uploaded supporting document, allowing the Admin to view it directly within the interface (e.g., embedded PDF viewer, image display) or download it.
        *   The detail view SHALL display the Parent/Guardian's verification selfie prominently.
        *   The system **SHOULD** display metadata associated with the selfie (e.g., capture timestamp, device information) to aid in verification.
        *   The system **MUST** clearly indicate the current status of the request and the history of status changes (who changed it, when).

*   **FR-12: Request Approval/Rejection**
    *   Admins **MUST** have explicit "Approve" and "Reject" actions available for each `Pending` leave request.
    *   *Acceptance Criteria:*
        *   Clicking "Approve" SHALL change the request status to `Approved` and record the Admin user who performed the action and the timestamp. The new status SHALL be immediately visible to anyone checking the request's ticket code.
        *   Clicking "Reject" SHALL prompt the Admin with a mandatory text field to provide a rejection reason (minimum 10 characters, maximum 250 characters).
        *   Upon providing a reason and confirming rejection, the request status SHALL change to `Rejected`, the Admin and timestamp SHALL be recorded, and the rejection reason SHALL become visible on the ticket status page.
        *   Once a request is `Approved` or `Rejected`, the "Approve" and "Reject" actions SHALL no longer be available for that specific request.
        *   The system **MUST** prevent an Admin from approving or rejecting a request that is already in an `Approved` or `Rejected` state.

*   **FR-13: Historical Reporting & Archival**
    *   The system **MUST** maintain a complete, immutable historical record of all leave requests and their status changes for archival, audit, and reporting purposes.
    *   *Acceptance Criteria:*
        *   Admins SHALL be able to access a dedicated report or filtered view showing all requests, regardless of their current or past status.
        *   The system SHALL allow exporting this historical data (e.g., CSV, PDF) based on applied filters (e.g., date range, student, parent, status, leave type).
        *   The exported historical data SHALL include all original details of the request, the final status, the Admin who processed it, and any rejection reasons.
        *   The system **MUST** retain all request data, including uploaded documents and selfies, for a minimum of 5 years to comply with potential audit and regulatory requirements.
        *   The system **SHOULD** provide basic aggregated reports (e.g., total leaves per month, top reasons for leave).

## Non-Functional Requirements

This section outlines the non-functional attributes that the IzinSiswa application **MUST** possess to ensure quality, performance, security, and usability.

| Category | Requirement | Measurable Target |
|:---|:---|:---|
| **Performance** | API Response Time (p95) | < 300ms for 95% of all core API calls (login, request submission, status update, list retrieval). < 500ms for 95% of complex queries (e.g., Admin historical reports with multiple filters). |
| | Page Load Time (cold start) | < 3 seconds on average for initial page load on target browsers (latest Chrome, Firefox, Safari, Edge; both desktop and mobile viewports) under typical network conditions. |
| | File Upload Speed | < 10 seconds for files up to 5MB (documents, selfies) on a stable 5 Mbps internet connection. A visible progress indicator SHALL be displayed for uploads exceeding 2 seconds. |
| | Concurrent Users | The system **MUST** support 500 concurrent active users (e.g., 100 Admins, 400 anonymous Parent sessions) without any noticeable performance degradation (i.e., all response times remain within their specified targets). |
| **Security** | Authentication & Authorization | All Admin API endpoints **MUST** be secured using JWTs. Access tokens SHALL have a short expiry (e.g., 1 hour), and a robust refresh token mechanism **MUST** be implemented. Role-based access control (RBAC) **MUST** be strictly enforced at the API level. Public (Parent-facing) endpoints require no authentication but **MUST** be rate-limited to deter abuse of student search and leave-request submission. |
| | Data Storage (Files) | All user-uploaded files (documents, selfies) **MUST** be stored in a private AWS S3 bucket. Direct access to these files SHALL be prevented; access SHALL only be granted via time-limited, pre-signed URLs generated by the backend. |
| | Data in Transit | All communication between client applications (mobile, web) and the backend API **MUST** use TLS 1.2 or higher. HTTP Strict Transport Security (HSTS) **SHOULD** be enforced for all web interfaces. |
| | Data at Rest | All sensitive data (e.g., Personal Identifiable Information (PII) of students and parents, uploaded files) **MUST** be encrypted at rest using industry-standard encryption algorithms (e.g., AES-256). |
| | Vulnerability Management | The system **MUST** undergo regular security audits (at least annually) and penetration testing by an independent third party. All identified critical and high-severity vulnerabilities **MUST** be patched within 7 days of discovery. |
| | Input Validation | All user inputs (frontend and API) **MUST** be rigorously validated to prevent common vulnerabilities such as SQL injection, XSS, and buffer overflows. |
| **Scalability** | Horizontal Scalability | The backend architecture **MUST** be designed to support horizontal scaling, allowing for increased user load and data volume by adding more server instances without requiring code changes. |
| | Database Scalability | The PostgreSQL database **MUST** be configured for read replicas to distribute read loads and **SHOULD** be designed with sharding capabilities in mind for future data growth. |
| **Reliability & Availability** | Uptime | The system **MUST** maintain an uptime of 99.9% (equivalent to less than 8.76 hours of downtime per year), excluding pre-announced scheduled maintenance windows. |
| | Data Backup & Recovery | Automated daily backups of the entire database and file storage **MUST** be performed. A documented disaster recovery plan **MUST** be in place, enabling full system restoration within 24 hours in case of a catastrophic failure. |
| | Error Handling & Logging | The system **MUST** implement robust error handling for all critical operations and comprehensive, centralized logging for all application events, errors, and security-related activities. Logs SHALL be monitored for anomalies. |
| **Usability** | User Interface (UI) | The UI for both the public Parent/Guardian web app and the Admin web interface **MUST** be formal, professional, intuitive, responsive (mobile and desktop browsers), and consistent with modern design principles. It **SHOULD** require minimal training for new users. |
| | User Experience (UX) | Navigation **MUST** be clear and logical. All user actions **MUST** provide immediate and appropriate feedback (e.g., loading indicators, success messages, error alerts). |
| | Accessibility | The application **SHOULD** adhere to WCAG 2.1 AA guidelines where feasible, particularly concerning color contrast, text sizing, and keyboard navigation for the Admin interface. |
| **Maintainability** | Code Quality | The codebase **MUST** adhere to established coding standards, be well-documented with inline comments and external documentation, and follow clean architecture principles to facilitate future development, debugging, and maintenance. |
| | Test Coverage | Automated unit tests **MUST** cover at least 80% of the backend business logic. Integration tests **MUST** cover all critical end-to-end user flows for both Parent/Guardian and Admin roles. |
| **Compliance** | Data Privacy (GDPR/Local) | The system **MUST** comply with all relevant data privacy regulations (e.g., GDPR, local Indonesian data protection laws) regarding the collection, storage, processing, and retention of personal and student data. |

## Technical Constraints

These are the hard limitations and mandatory choices for the IzinSiswa project's technical implementation.

1.  **Platform Focus:** The initial product release **MUST** be a responsive web application (e.g., React.js/Next.js), accessible via modern web browsers on both desktop and mobile devices. A dedicated native mobile app (iOS/Android) is explicitly out of scope for the initial phase.
2.  **Admin Interface:** The Admin interface **MUST** be a web-based application, accessible via modern web browsers (latest stable versions of Chrome, Firefox, Safari, Edge).
3.  **Authentication Provider:** Admin authentication **MUST** be handled internally using JSON Web Tokens (JWTs). Reliance on external OAuth providers (e.g., Google, Facebook login) is not permitted. Parent/Guardian users **MUST NOT** authenticate at all — they access the system exclusively via public student search (name/NIS) and ticket-code status tracking, with no credentials of any kind.
4.  **Cloud Provider:** All infrastructure, services, and deployments **MUST** be hosted exclusively on Amazon Web Services (AWS).
5.  **Database Technology:** PostgreSQL **MUST** be used as the primary relational database for all structured data storage. The use of NoSQL databases for core application data is out of scope.
6.  **File Storage:** AWS S3 **MUST** be used for the storage of all user-uploaded files, including supporting documents and verification selfies.
7.  **Status Delivery:** Since Parent/Guardian users have no account and no installed app, status updates **MUST** be delivered exclusively through the ticket-code tracking page. Push notification services (e.g., FCM) are out of scope for the initial release.
8.  **Offline Capability:** The application **MUST NOT** support offline functionality. Continuous internet connectivity is a prerequisite for all application operations for both Parent/Guardian and Admin users.
9.  **User Registration:** Parent/Guardian self-registration and login **MUST NOT** be implemented under any circumstance; they are identified only by matching an existing student record via search. Admin accounts **MUST** be created and managed exclusively by authorized school personnel.
10. **Integration Limitations:** Direct, real-time integration with existing school Student Information Systems (SIS) or other third-party school management systems is out of scope for the initial release. Data import/export will be handled manually or via batch processes if required.
11. **Budget Adherence:** Development and infrastructure costs **MUST** remain strictly within the allocated "Starter Tier" budget. This necessitates prioritizing cost-effective AWS services and leveraging open-source technologies where appropriate.
12. **Schema and Endpoint Definitions:** Detailed database schema definitions, API endpoint specifications, and specific error codes are documented in `DATABASE.md` and `API.md` respectively, and are not duplicated here.

## Assumptions

These are external factors and conditions that are assumed to be true for the successful development and deployment of the IzinSiswa application. Should any of these assumptions prove false, it may impact the project's scope, timeline, or cost.

1.  **Parent/Guardian Device Access:** It is assumed that all Parent/Guardians who are expected to use the application possess a device (smartphone, tablet, or computer) with a modern web browser and sufficient capabilities (e.g., working camera, stable internet access) to use the web app effectively.
2.  **Admin Device Access:** School administrators are assumed to have consistent access to a computer or tablet with reliable internet connectivity to manage requests via the web-based Admin interface.
3.  **Internet Connectivity:** Stable and reliable internet connectivity is assumed to be available for both Parent/Guardian users and school administrators (for web app usage) at all times during application operation.
4.  **School Policies:** The school is assumed to have established clear, documented, and communicated policies regarding:
    *   Acceptable types of student leave and the specific supporting documentation required for each.
    *   The internal process and criteria for school administrators to approve or reject leave requests.
    *   Data retention policies for student records, parent information, and leave request history.
5.  **Initial Data Accuracy:** The initial student and parent data provided by the school for system setup and population is assumed to be accurate, complete, and up-to-date.
6.  **User Training & Adoption:** It is assumed that the school will facilitate basic training or provide clear user guides to both Parent/Guardian and Admin users to ensure effective adoption and correct usage of the application.
7.  **Legal & Regulatory Compliance:** The school is responsible for ensuring that the implementation and use of the IzinSiswa application, including the collection of parent selfies and student personal data, fully complies with all relevant local data privacy laws, educational regulations, and school-specific policies.
8.  **Single School Instance:** The system is designed and developed for a single school entity. Features for managing multiple schools or branches within a single instance are not assumed or supported in this initial phase.
9.  **Language Support:** The initial version of the application will primarily support English and Bahasa Indonesia. It is assumed that these two languages adequately cover the primary user base for the school.
10. **Technical Proficiency:** Users (both Parent/Guardian and Admin) are assumed to possess basic technical proficiency to operate a web browser and web-based system.