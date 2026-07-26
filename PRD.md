# PRD: IzinSiswa: Aplikasi Perizinan Digital

## Executive Summary & Product Vision

IzinSiswa is a web-based application designed to digitize and streamline the school leave request process. Parents/guardians can submit a leave request without creating an account: they search for their child by full name or NIS (Nomor Induk Siswa / Student ID) already registered by the school admin, confirm the correct student, and fill out a request form — providing their own name and WhatsApp number plus supporting documentation and real-time identity verification — for review and approval by school administrators. The product vision is to create a single, reliable, and efficient digital channel for managing student absences, replacing manual, paper-based workflows.

## Problem Statement & Target Users

The current process for requesting student leave in many schools relies on paper forms, phone calls, or informal messaging applications. This is inefficient, difficult to track, prone to miscommunication, and lacks a formal audit trail.

*   **Target User 1: Parents/Guardians:** Require a fast, verified method — without needing to register an account — to notify the school of their child's absence and submit formal requests.
*   **Target User 2: School Administrators:** Require a centralized system to efficiently receive, review, track, and archive all student leave requests.

## System Scope & User Roles

The system comprises two primary user roles with distinct permissions. All student data is pre-loaded and managed exclusively by the Admin role.

| Feature / Action | Parent/Guardian | Admin |
|:---|:---:|:---:|
| Login / Logout | ✗ (no account) | ✓ |
| Search Student by Name/NIS | ✓ | N/A |
| Submit Leave Request | ✓ | ✗ |
| Track Request Status via Ticket Code | ✓ | N/A |
| Manage Student Records (CRUD) | ✗ | ✓ |
| View All Leave Requests | ✗ | ✓ |
| Approve/Reject Request | ✗ | ✓ |
| View School-Wide Reports | ✗ | ✓ |

## Functional Requirements

**Parent/Guardian-Facing (Web App, No Account Required)**

*   **FR-01: Student Search:** Users must be able to find their child by entering the student's full name or NIS (Nomor Induk Siswa) into a search field on the public web app. No login, registration, or account is required.
*   **FR-02: Student Confirmation:** The system must display the matching student(s) (name, class, photo if available) so the parent can confirm the correct child before proceeding to the request form.
*   **FR-03: Leave Request Submission Form:** After confirming the student, users must provide their own name and WhatsApp number as the submitter's contact for the request, select a leave type from a predefined list (`Sakit`, `Keadaan Darurat Keluarga`, `Izin`), and specify start and end dates. Submitter name and WhatsApp number are mandatory fields, independent of any contact information already on file for the student. The WhatsApp number field only accepts numeric input, up to 12 digits.
*   **FR-04: Document Upload:** The request form must include a mandatory field for uploading supporting documents (e.g., doctor's note, official letter). The system must accept PDF, JPG, and PNG formats, with a maximum file size of 5MB.
*   **FR-05: Real-time Identity Verification:** As a final step in submission, the user must capture and attach a real-time selfie using the device/browser camera. The application must prevent uploads from the device's photo gallery for this specific step to ensure liveness.
*   **FR-06: Ticket Code Generation:** Upon successful submission, the system must generate and display a unique ticket code and a shareable status-check link.
*   **FR-07: Ticket-Based Status Tracking:** Users must be able to return to the app at any time, enter the ticket code, and view the current status of that specific request: `Pending`, `Approved`, or `Rejected`, including any rejection reason — no login required.

**Admin-Facing (Web Dashboard)**

*   **FR-08: Secure Admin Login:** Admins must log in via a separate, secure web-based portal.
*   **FR-09: Student Record Management:** Admins must have a dedicated interface to perform Create, Read, Update, and Deactivate (soft delete) operations on student records, including each student's NIS and parent/guardian contact information (name, phone number). No parent/guardian account or login is created — contact details are stored directly on the student record.
*   **FR-09a: Bulk Student Import (Excel):** Admins must be able to download a standard Excel template (columns: NIS, Nama Lengkap, Tingkat, Kelas) and upload a filled-in copy to create many student records at once. Parent/guardian contact fields are not part of the template and remain optional until completed later via the edit interface. The system must validate every row and report which rows succeeded and which failed (with reasons), without discarding the successful ones.
*   **FR-10: Centralized Request Dashboard:** The Admin dashboard must display a real-time, sortable, and filterable list of all leave requests. Filtering options must include status (`Pending`, `Approved`, `Rejected`), date range, and student name.
*   **FR-11: Request Detail View:** Admins must be able to click on any request to open a detailed view containing all submitted information: student details, leave dates, leave type, the uploaded supporting document (viewable in-browser), and the parent's verification selfie.
*   **FR-12: Request Adjudication:** From the detail view, Admins must have "Approve" and "Reject" action buttons for any request with a `Pending` status. A rejection action must allow the Admin to provide an optional, short text reason that will be visible to the parent via the ticket status page.
*   **FR-13: Reporting & Archiving:** The system must provide a historical, exportable view (e.g., to CSV) of all leave requests for archival and reporting purposes. The export must include all relevant data points for each request.

## Non-Functional Requirements

| Category | Requirement | Metric |
|:---|:---|:---:|
| Performance | API Response Time | < 300ms (p95) for all core API calls. |
| | Application Load Time | < 3 seconds for initial cold start. |
| | File Upload | < 10 seconds for files up to 5MB on a 5 Mbps connection. |
| Security | Authentication | All API endpoints secured via JWT. Access tokens must be short-lived (1 hour) with a refresh token mechanism. |
| | Data Storage | All user-uploaded files (documents, selfies) must be stored in a private S3 bucket. Access must be granted only via pre-signed URLs. |
| | Data in Transit | All client-server communication must be encrypted using TLS 1.2 or higher. |
| | Data at Rest | Sensitive data in the database (e.g., PostgreSQL) must be encrypted. |
| Scalability | Concurrent Users | The system must support 500 concurrent users without performance degradation. |
| | Data Growth | The database and storage solution must scale to handle a 50% year-over-year growth in data volume. |
| Availability | System Uptime | 99.5% uptime for all services, excluding scheduled maintenance windows. |
| Usability | Accessibility | The web application should adhere to WCAG 2.1 Level AA guidelines where applicable. |

## Technology Stack & Rationale

| Component | Technology | Rationale |
|:---|:---|:---|
| Web Frontend | React.js (Next.js) | Enables a responsive, single-codebase web app usable on both desktop and mobile browsers, with no app-store distribution needed. |
| Backend API | Node.js (Express) | Flexible, scalable, and leverages a vast JavaScript ecosystem, allowing for rapid development and integration. |
| Database | PostgreSQL | A powerful, feature-rich, and scalable relational database ideal for structured data and ensuring data integrity. |
| Authentication | JWT (Admin only) | Industry standard for stateless, secure API authentication. Parents/guardians do not authenticate; they use the student search + ticket code flow instead. |
| File Storage | AWS S3 | Highly scalable, durable, and cost-effective object storage for user-uploaded documents and images. |
| Hosting | AWS Amplify | Simplifies hosting for the frontend and integrates seamlessly with other AWS services like S3 and backend APIs. |

## Success Metrics & KPIs

| Category | Metric | Target |
|:---|:---|:---|
| Adoption | Percentage of Parents Registered | > 90% of all parents registered within 3 months of launch. |
| Engagement | Daily Active Users (DAU) - Parents | > 10% of registered parents during school term. |
| Efficiency | Average Request Approval Time | < 4 business hours from submission to final status. |
| Process Improvement | Paper/Phone-based Requests | < 5% of total requests after 3 months of launch. |
| System Health | API Error Rate | < 0.1% of all API calls. |

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
|:---|:---:|:---|
| Data Privacy Breach | High | Implement strict access controls, end-to-end encryption (TLS, data-at-rest), regular security audits, and compliance with local data protection regulations. |
| Selfie Verification Bypass | Medium | Implement basic liveness detection (e.g., requiring a specific action during selfie capture) and server-side validation of image metadata to detect gallery uploads. |
| Unauthorized Submission (no parent account) | Medium | Since anyone can search a student by name/NIS, the required document plus real-time selfie plus Admin adjudication act as compensating controls. NIS is not published publicly and Admins remain the final human check before approval. |
| Low Parent Adoption | Medium | Conduct parent onboarding sessions. Ensure the UI/UX is extremely simple and intuitive. Provide clear communication from the school mandating the app's use. |
| Forged Supporting Documents | Medium | While impossible to eliminate completely, the combination of a required document, a real-time selfie, and Admin adjudication acts as a multi-factor deterrent. Admins are the final human check. |
| System Downtime | High | Deploy the application on a high-availability cloud infrastructure (e.g., AWS with multi-AZ deployment). Implement comprehensive monitoring, alerting, and automated failover mechanisms. |

## Constraints & Assumptions

**Constraints:**
*   The initial release is a fully web-based application (responsive, no native mobile app) for both parents/guardians and Admins.
*   Parents/guardians do not have accounts; they must be able to locate their child via name or NIS as pre-loaded by the Admin.
*   The school is responsible for providing the initial, clean dataset of students, their NIS, and their associated parent/guardian contact information for system setup.
*   The application will support only one school per deployment instance.

**Assumptions:**
*   Parents/guardians have access to a device (smartphone, tablet, or computer) with a modern web browser, a functional camera for selfie capture, and reliable internet access.
*   The school has at least one dedicated administrator to manage the system.
*   The school will enforce the use of this application as the sole method for submitting leave requests.

## Out of Scope

The following features and functionalities are explicitly out of scope for the initial version (v1.0):

*   A native mobile application (iOS/Android) for parents/guardians.
*   Direct teacher-parent communication features.
*   A dedicated role or dashboard for teachers.
*   Integration with third-party School Information Systems (SIS) for attendance or grading.
*   Advanced analytics dashboards beyond the core reporting features.
*   Multi-language support within the application.
*   Payment processing for any school-related fees.