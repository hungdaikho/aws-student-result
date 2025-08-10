# API Documentation - Student Results App

## Mục lục

1. [API Public](#api-public)
2. [API Admin](#api-admin)
3. [Student Data Structure](#student-data-structure)
4. [Error Responses](#error-responses)

---

## API Public

### 1. Search API

**Endpoint:** `GET /api/search`

**Description:** Tìm kiếm thông tin học sinh theo số báo danh

**Query Parameters:**

- `matricule` (required): Số báo danh của học sinh
- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")

**Success Response (200):**

```json
{
  "matricule": "123456789",
  "nom_complet": "NGUYEN VAN A",
  "ecole": "Lycée National",
  "etablissement": "Etablissement ABC",
  "moyenne": 15.25,
  "rang": 1,
  "admis": true,
  "decision_text": "ADMIS",
  "section": "SCIENCES_EXP",
  "wilaya": "Alger",
  "rang_etablissement": 1,
  "year": 2025,
  "examType": "BAC",
  "lieu_nais": "Alger",
  "date_naiss": "01/01/2005"
}
```

**Error Responses:**

```json
// 400 - Bad Request
{
  "error": "Matricule is required"
}

// 404 - Not Found
{
  "error": "Étudiant non trouvé"
}

// 500 - Internal Server Error
{
  "error": "Internal server error"
}
```

---

### 2. Statistics API

**Endpoint:** `GET /api/statistics`

**Description:** Lấy thống kê tổng quan

**Query Parameters:**

- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")

**Success Response (200):**

```json
{
  "totalStudents": 15000,
  "admittedStudents": 8500,
  "admissionRate": "56.7",
  "sessionnaireRate": "12.3",
  "averageScore": "12.45",
  "sectionStats": [
    {
      "name": "SCIENCES_EXP",
      "total": 5000,
      "admitted": 3200,
      "rate": "64.0"
    }
  ],
  "wilayaStats": [
    {
      "name": "Alger",
      "total": 2000,
      "admitted": 1300,
      "rate": "65.0"
    }
  ],
  "year": 2025,
  "examType": "BAC"
}
```

---

### 3. Leaderboard API

**Endpoint:** `GET /api/leaderboard`

**Description:** Lấy bảng xếp hạng học sinh giỏi

**Query Parameters:**

- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")

**Success Response (200):**

**For BAC (object with sections):**

```json
{
  "SCIENCES_EXP": [
    {
      "matricule": "123456789",
      "nom_complet": "NGUYEN VAN A",
      "moyenne": 18.5,
      "rang": 1,
      "ecole": "Lycée National",
      "wilaya": "Alger"
    }
  ],
  "MATHS": [
    {
      "matricule": "987654321",
      "nom_complet": "TRAN THI B",
      "moyenne": 18.25,
      "rang": 1,
      "ecole": "Lycée Elite",
      "wilaya": "Oran"
    }
  ]
}
```

**For BREVET (array of top students):**

```json
[
  {
    "matricule": "111222333",
    "nom_complet": "LE VAN C",
    "moyenne": 17.8,
    "rang": 1,
    "ecole": "Collège Central",
    "wilaya": "Constantine"
  }
]
```

---

### 4. Wilayas API

**Endpoint:** `GET /api/wilayas`

**Description:** Lấy danh sách wilaya và các trường học

**Query Parameters:**

- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")

**Success Response (200):**

```json
{
  "Alger": ["Lycée National Alger", "Lycée Elite Alger", "Lycée Central Alger"],
  "Oran": ["Lycée National Oran", "Lycée Moderne Oran"],
  "Constantine": ["Lycée Central Constantine"]
}
```

---

### 5. School API

**Endpoint:** `GET /api/school`

**Description:** Lấy danh sách học sinh của một trường học

**Query Parameters:**

- `name` (required): Tên trường học
- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")

**Success Response (200):**

```json
[
  {
    "matricule": "123456789",
    "nom_complet": "NGUYEN VAN A",
    "moyenne": 15.25,
    "rang": 1,
    "rang_etablissement": 1,
    "admis": true,
    "decision_text": "ADMIS",
    "section": "SCIENCES_EXP",
    "wilaya": "Alger"
  }
]
```

**Error Responses:**

```json
// 400 - Bad Request
{
  "error": "School name is required"
}

// 500 - Internal Server Error
{
  "error": "Internal server error"
}
```

---

### 6. Wilaya Students API

**Endpoint:** `GET /api/wilaya-students`

**Description:** Lấy danh sách học sinh theo wilaya (có phân trang)

**Query Parameters:**

- `name` (required): Tên wilaya
- `year` (optional): Năm học (default: 2025)
- `examType` (optional): Loại kỳ thi ("BAC" | "BREVET", default: "BAC")
- `page` (optional): Trang hiện tại (default: 1)
- `limit` (optional): Số lượng học sinh mỗi trang (default: 50)
- `section` (optional): Lọc theo khối ("all" | tên khối, default: "all")

**Success Response (200):**

```json
{
  "students": [
    {
      "matricule": "123456789",
      "nom_complet": "NGUYEN VAN A",
      "moyenne": 15.25,
      "rang": 1,
      "admis": true,
      "section": "SCIENCES_EXP",
      "ecole": "Lycée National",
      "etablissement": "Etablissement ABC"
    }
  ],
  "totalCount": 2000,
  "totalPages": 40,
  "currentPage": 1,
  "admittedCount": 1300,
  "averageScore": 12.45,
  "sections": ["SCIENCES_EXP", "MATHS", "LETTRES_PHIL"]
}
```

---

## API Admin

### 1. Upload API

**Endpoint:** `POST /api/admin/upload`

**Description:** Upload file Excel chứa dữ liệu học sinh

**Request:** Multipart form data

- `excel` (File): File Excel (.xlsx hoặc .xls)
- `year` (string): Năm học (2020-2030)
- `examType` (string): Loại kỳ thi ("BAC" | "BREVET")
- `columnMapping` (string, optional): JSON string mapping các cột

**Success Response (200):**

```json
{
  "message": "Successfully processed 1500 student records for BAC 2025",
  "stats": {
    "totalStudents": 1500,
    "admittedStudents": 850,
    "admissionRate": "56.7",
    "sections": ["SCIENCES_EXP", "MATHS", "LETTRES_PHIL"],
    "schools": ["Lycée A", "Lycée B"],
    "establishments": ["Etablissement 1", "Etablissement 2"],
    "wilayas": ["Alger", "Oran", "Constantine"],
    "averageScore": "12.45"
  },
  "fileInfo": {
    "name": "students_2025.xlsx",
    "size": 2048576,
    "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  },
  "dbInfo": {
    "stored": true,
    "year": 2025,
    "examType": "BAC"
  }
}
```

**Error Responses:**

```json
// 400 - Invalid content type
{
  "error": "Invalid content type. Expected multipart/form-data",
  "received": "application/json",
  "help": "Make sure you're sending the file as FormData"
}

// 413 - File too large
{
  "error": "File too large. Maximum size is 4.5MB for uploads.",
  "size": "5242880",
  "maxSize": 4718592
}

// 400 - Missing required columns
{
  "error": "Missing required columns for BAC. Missing fields: matricule, nom_complet. Available columns: Col1, Col2, Col3..."
}

// 500 - Database error
{
  "error": "Database not configured. Please configure DATABASE_URL."
}
```

---

### 2. Analyze Excel API

**Endpoint:** `POST /api/admin/analyze-excel`

**Description:** Phân tích file Excel trước khi upload

**Request:** Multipart form data

- `excel` (File): File Excel để phân tích
- `examType` (string): Loại kỳ thi ("BAC" | "BREVET")

**Success Response (200):**

```json
{
  "success": true,
  "fileName": "students_2025.xlsx",
  "fileSize": 2048576,
  "examType": "BAC",
  "columns": ["NODOSS", "NOMPL", "SERIE", "MOYBAC", "Decision"],
  "sampleData": [
    {
      "NODOSS": "123456789",
      "NOMPL": "NGUYEN VAN A",
      "SERIE": "SCIENCES_EXP",
      "MOYBAC": "15.25",
      "Decision": "ADMIS"
    }
  ],
  "totalRows": 1500,
  "requiredFields": [
    {
      "field": "matricule",
      "description": "Numéro de dossier/matricule de l'étudiant"
    }
  ],
  "suggestedMapping": {
    "matricule": "NODOSS",
    "nom_complet": "NOMPL",
    "section": "SERIE",
    "moyenne": "MOYBAC",
    "decision": "Decision"
  }
}
```

---

### 3. Database Info API

**Endpoint:** `GET /api/admin/db-info`

**Description:** Lấy thông tin database

**Success Response (200):**

```json
{
  "status": "SUCCESS",
  "message": "Database information retrieved",
  "configured": true,
  "summary": {
    "totalStudents": 15000,
    "totalAdmitted": 8500,
    "admissionRate": "56.7",
    "totalYears": 3,
    "totalExamTypes": 2,
    "totalSections": 8,
    "totalEstablishments": 250,
    "totalWilayas": 48,
    "tableSize": "25 MB",
    "databaseSize": "50 MB"
  },
  "data": [
    {
      "key": "BAC 2025",
      "year": 2025,
      "examType": "BAC",
      "studentCount": 10000,
      "admittedCount": 6000,
      "admissionRate": "60.0",
      "averageScore": 12.5,
      "sectionsCount": 6,
      "establishmentsCount": 200,
      "wilayasCount": 48,
      "firstUpload": "2025-01-01T00:00:00.000Z",
      "lastUpdate": "2025-01-15T10:30:00.000Z"
    }
  ],
  "duplicates": [
    {
      "matricule": "123456789",
      "count": 2,
      "names": ["NGUYEN VAN A", "NGUYEN VAN A"]
    }
  ],
  "environment": {
    "hasDatabase": true,
    "region": "us-east-1"
  }
}
```

---

### 4. Clear Data API

**Endpoint:** `DELETE /api/admin/clear`

**Description:** Xóa dữ liệu theo năm và loại kỳ thi

**Query Parameters:**

- `year` (required): Năm học
- `examType` (required): Loại kỳ thi ("BAC" | "BREVET")

**Success Response (200):**

```json
{
  "message": "All student data for BAC 2025 has been cleared successfully",
  "deletedRecords": 1500
}
```

**Error Responses:**

```json
// 400 - Invalid parameters
{
  "error": "Invalid year provided"
}

// 500 - Database error
{
  "error": "Failed to clear data",
  "details": "Database connection failed"
}
```

---

## Student Data Structure

```typescript
interface Student {
  matricule: string; // Số báo danh
  nom_complet: string; // Họ tên đầy đủ
  ecole: string; // Trường học
  etablissement: string; // Cơ sở giáo dục
  moyenne: number; // Điểm trung bình
  rang: number; // Thứ hạng chung
  admis: boolean; // Trạng thái đậu/rớt
  decision_text: string; // Quyết định (ADMIS/NON ADMIS/...)
  section: string; // Khối/ngành
  wilaya?: string; // Tỉnh/thành
  rang_etablissement?: number; // Thứ hạng trong trường
  year: number; // Năm học
  examType: "BAC" | "BREVET"; // Loại kỳ thi
  lieu_nais?: string; // Nơi sinh
  date_naiss?: string; // Ngày sinh
}
```

---

## Error Responses

### Common Error Status Codes:

- **400 Bad Request**: Dữ liệu đầu vào không hợp lệ
- **404 Not Found**: Không tìm thấy dữ liệu
- **408 Request Timeout**: Timeout khi xử lý request
- **413 Payload Too Large**: File quá lớn
- **500 Internal Server Error**: Lỗi server
- **507 Insufficient Storage**: Hết bộ nhớ

### Standard Error Response Format:

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)",
  "timestamp": "2025-07-30T10:30:00.000Z"
}
```

---

## Notes

1. **Caching**: Các API public có cache 5 phút để tối ưu hiệu suất
2. **Rate Limiting**: Không có rate limiting hiện tại
3. **Authentication**: API admin không có authentication (cần thêm)
4. **File Limits**: Upload file tối đa 4.5MB
5. **Database**: Sử dụng PostgreSQL với connection pooling
6. **Timeout**: API timeout sau 60 giây (Vercel limit)
