# API.md: IzinSiswa: Aplikasi Perizinan Digital

This document outlines the API specifications for the IzinSiswa backend service, providing details on authentication, standard response formats, and core endpoints for managing student leave requests.

## Authentication & Authorization

The API uses JSON Web Tokens (JWT) for **Admin authentication only**. Upon successful Admin login, a JWT is issued, which must be included in the `Authorization` header of all subsequent Admin-protected requests.

Parent/Guardian users **never authenticate**. All Parent-facing endpoints below are public — access is instead gated by knowledge of a valid student NIS/name (for search and submission) or a valid ticket code (for status tracking). These public endpoints **MUST** be rate-limited to deter scraping/abuse.

*   **Method:** JWT (JSON Web Tokens), Admin endpoints only
*   **Header Format:** `Authorization: Bearer <your_jwt_token>`
*   **Token Expiry:** JWTs will have a short expiry time (e.g., 1 hour) and require a refresh mechanism (not detailed in this document, but assumed to be implemented).

## Standard Response & Pagination Formats

All API responses will adhere to a consistent JSON structure for both success and error scenarios.

### Success Response

Successful responses will typically include a `success` flag and a `data` object or `message`.

```json
// Example for data retrieval
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "name": "John Doe"
  }
}

// Example for action confirmation
{
  "success": true,
  "message": "Request submitted successfully."
}
```

### Error Response

Error responses will include a `success` flag set to `false` and an `error` object containing a `code` and a descriptive `message`.

```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials provided."
  }
}
```

### Pagination Format

List endpoints that support pagination will include a `pagination` object in the response.

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

## API Endpoints

The following are the essential API endpoints for the IzinSiswa application, grouped by domain.

### 1. Authentication

#### Admin Login

*   **Method:** `POST`
*   **Path:** `/admin/auth/login`
*   **Description:** Authenticates a school Admin and returns a JWT. There is no equivalent login for Parent/Guardian users — they never authenticate.
*   **Auth Level:** Public
*   **Request Body (JSON):**
    ```json
    {
      "email": "admin@school.example.com",
      "password": "securepassword123"
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
          "id": "admin-uuid-abc",
          "name": "Admin Sekolah"
        }
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Login successful.
    *   `401 Unauthorized`: Invalid credentials.
    *   `400 Bad Request`: Missing email or password.

### 2. Parent-Facing Endpoints (Public, No Auth)

#### Search Student

*   **Method:** `GET`
*   **Path:** `/students/search`
*   **Description:** Publicly searches for an active student by full/partial name or by exact NIS, so a parent can find and confirm their child before submitting a leave request. Returns only minimal, non-sensitive fields.
*   **Auth Level:** Public
*   **Request Body (JSON):** None (Query parameters: `?query=Jane` or `?query=0012345678`)
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "student-uuid-456",
          "fullName": "Jane Doe",
          "nis": "0012345678",
          "grade": "10",
          "class": "IPA 1"
        }
      ]
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Search completed (possibly with an empty array).
    *   `400 Bad Request`: Missing or too-short query.

#### Submit New Leave Request

*   **Method:** `POST`
*   **Path:** `/leave-requests`
*   **Description:** Submits a new leave request for a confirmed student. No account or login is involved. `parentName` and `parentWhatsapp` are the submitter's own contact details, mandatory on every request regardless of any contact info already on file for the student. `parentWhatsapp` **MUST** be numeric only (digits 0-9), 9 to 12 digits long — any other format is rejected with `400`. The `documentUrl` and `selfieUrl` must be pre-signed S3 URLs obtained by the client prior to this request, where the actual files have already been uploaded. On success, a unique `ticketCode` is returned for later status tracking.
*   **Auth Level:** Public
*   **Request Body (JSON):**
    ```json
    {
      "studentId": "student-uuid-456",
      "parentName": "John Doe",
      "parentWhatsapp": "081234567890",
      "leaveType": "Sick Leave",
      "startDate": "2023-10-26",
      "endDate": "2023-10-27",
      "reason": "Fever and flu symptoms.",
      "documentUrl": "https://s3.amazonaws.com/izin-siswa-docs/doc-uuid-789.pdf?AWSAccessKeyId=...",
      "selfieUrl": "https://s3.amazonaws.com/izin-siswa-selfies/selfie-uuid-012.jpg?AWSAccessKeyId=..."
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "message": "Leave request submitted successfully.",
      "data": {
        "id": "request-uuid-345",
        "ticketCode": "IZS-8K3PQR",
        "studentName": "Jane Doe",
        "status": "Pending"
      }
    }
    ```
*   **Status Codes:**
    *   `201 Created`: Request submitted successfully.
    *   `400 Bad Request`: Invalid input data (e.g., missing fields, invalid dates, unknown/inactive `studentId`).

#### Track Leave Request by Ticket Code

*   **Method:** `GET`
*   **Path:** `/leave-requests/track`
*   **Description:** Publicly retrieves the status of a single leave request using its ticket code. Does not expose the uploaded document or selfie.
*   **Auth Level:** Public
*   **Request Body (JSON):** None (Query parameter: `?ticketCode=IZS-8K3PQR`)
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "data": {
        "ticketCode": "IZS-8K3PQR",
        "studentName": "Jane Doe",
        "leaveType": "Sick Leave",
        "startDate": "2023-10-26",
        "endDate": "2023-10-27",
        "status": "Rejected",
        "rejectionReason": "Insufficient notice.",
        "submittedAt": "2023-10-25T10:00:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Ticket code found.
    *   `404 Not Found`: Ticket code does not exist.

### 3. Admin-Facing Endpoints

#### Download Student Import Template

*   **Method:** `GET`
*   **Path:** `/admin/students/template`
*   **Description:** Returns the standard Excel (`.xlsx`) template used for bulk student import, pre-filled with the required header row: `NIS`, `Nama Lengkap`, `Tingkat`, `Kelas`.
*   **Auth Level:** Admin
*   **Request Body (JSON):** None
*   **Response:** Binary `.xlsx` file (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
*   **Status Codes:**
    *   `200 OK`: Template returned successfully.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an Admin.

#### Bulk Upload Students (Excel)

*   **Method:** `POST`
*   **Path:** `/admin/students/bulk-upload`
*   **Description:** Uploads a filled-in copy of the student import template to create multiple student records at once. Every row is validated; valid rows are created even if other rows in the same file fail. Parent/guardian contact fields are not part of the template and are left empty for the Admin to complete later.
*   **Auth Level:** Admin
*   **Request Body:** `multipart/form-data` with a single `file` field containing the `.xlsx` file (max 2MB).
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "message": "Import selesai: 47 berhasil, 3 gagal.",
      "data": {
        "totalRows": 50,
        "successCount": 47,
        "failureCount": 3,
        "createdStudentIds": ["student-uuid-101", "student-uuid-102"],
        "errors": [
          {
            "row": 12,
            "nis": "0012345678",
            "reason": "NIS sudah terdaftar."
          },
          {
            "row": 27,
            "nis": "",
            "reason": "NIS wajib diisi."
          },
          {
            "row": 33,
            "nis": "0099998888",
            "reason": "NIS duplikat di dalam file."
          }
        ]
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Import processed (see `data.errors` for any per-row failures; partial success is not an error).
    *   `400 Bad Request`: File missing, not a valid `.xlsx`, headers do not match the template, or file exceeds the size limit.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an Admin.

#### Get All Leave Requests

*   **Method:** `GET`
*   **Path:** `/admin/leave-requests`
*   **Description:** Retrieves a list of all leave requests in the system, with filtering capabilities by status, date range, and student name. `parentName`/`parentPhone` reflect the submitter's own contact info entered on that request, not the student's on-file contact.
*   **Auth Level:** Admin
*   **Request Body (JSON):** None (Query parameters for filtering/pagination: `?status=Pending&startDate=2023-10-01&endDate=2023-10-31&studentName=Jane&page=1&limit=10`)
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "request-uuid-345",
          "ticketCode": "IZS-8K3PQR",
          "studentId": "student-uuid-456",
          "studentName": "Jane Doe",
          "parentName": "John Doe",
          "parentPhone": "+6281234567890",
          "leaveType": "Sick Leave",
          "startDate": "2023-10-26",
          "endDate": "2023-10-27",
          "reason": "Fever and flu symptoms.",
          "documentUrl": "https://s3.amazonaws.com/izin-siswa-docs/doc-uuid-789.pdf",
          "selfieUrl": "https://s3.amazonaws.com/izin-siswa-selfies/selfie-uuid-012.jpg",
          "status": "Pending",
          "submittedAt": "2023-10-25T10:00:00Z"
        }
        // ... more requests
      ],
      "pagination": {
        "totalItems": 15,
        "totalPages": 2,
        "currentPage": 1,
        "itemsPerPage": 10
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Successfully retrieved leave requests.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an Admin.

#### Update Leave Request Status (Approve/Reject)

*   **Method:** `PATCH`
*   **Path:** `/admin/leave-requests/{requestId}/status`
*   **Description:** Allows an Admin to approve or reject a specific leave request.
*   **Auth Level:** Admin
*   **Request Body (JSON):**
    ```json
    {
      "status": "Approved"
    }
    // OR for rejection
    {
      "status": "Rejected",
      "rejectionReason": "Document provided is not valid."
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "success": true,
      "message": "Leave request status updated successfully.",
      "data": {
        "id": "request-uuid-345",
        "status": "Approved",
        "approvedBy": "admin-uuid-abc",
        "approvedAt": "2023-10-25T11:30:00Z"
      }
    }
    ```
*   **Status Codes:**
    *   `200 OK`: Status updated successfully.
    *   `400 Bad Request`: Invalid status or missing rejection reason.
    *   `401 Unauthorized`: Missing or invalid token.
    *   `403 Forbidden`: User is not an Admin.
    *   `404 Not Found`: Request ID does not exist.