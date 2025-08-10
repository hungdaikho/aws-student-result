# Logic Xử Lý Cột Decision - Xác Định Trạng Thái Admis

## Tổng Quan

Khi upload file Excel, hệ thống sẽ tự động xử lý cột `Decision` để xác định trạng thái `admis` (đậu/rớt) của học sinh dựa trên các quy tắc logic được định nghĩa sẵn.

## Quy Tắc Logic

### 1. **Được Nhận (admis = true)**

Học sinh được coi là **ĐẬU** khi cột Decision chứa các từ khóa sau:

| Từ khóa   | Mô tả               | Ví dụ                   |
| --------- | ------------------- | ----------------------- |
| `admis`   | Admis, Admise       | "Admis", "Admise"       |
| `reussi`  | Réussi, Réussie     | "Réussi", "Réussie"     |
| `reussie` | Cách viết khác      | "Reussie"               |
| `success` | Tiếng Anh           | "Success", "Successful" |
| `r`       | Viết tắt của Réussi | "R"                     |
| `a`       | Viết tắt của Admis  | "A"                     |
| `pass`    | Passé, Passed       | "Passé", "Passed"       |
| `valide`  | Validé              | "Validé"                |

### 2. **Không Được Nhận - Sessionnaire (admis = false)**

Học sinh **SESSIONN** (thi lại) không được coi là đậu chính thức:

| Từ khóa        | Mô tả          | Ví dụ          |
| -------------- | -------------- | -------------- |
| `sessionnaire` | Thi lại đầy đủ | "Sessionnaire" |
| `sessionn`     | Viết tắt       | "Sessionn"     |
| `session`      | Session        | "Session"      |
| `rattrapage`   | Thi bù         | "Rattrapage"   |

### 3. **Không Được Nhận - Rớt (admis = false)**

Học sinh **RỚT** khi cột Decision chứa:

| Từ khóa   | Mô tả     | Ví dụ            |
| --------- | --------- | ---------------- |
| `echec`   | Échec     | "Échec"          |
| `echoue`  | Échoué    | "Échoué"         |
| `refuse`  | Refusé    | "Refusé"         |
| `elimine` | Éliminé   | "Éliminé"        |
| `ajourne` | Ajourné   | "Ajourné"        |
| `fail`    | Tiếng Anh | "Failed", "Fail" |
| `reject`  | Tiếng Anh | "Rejected"       |

### 4. **Mặc Định (admis = false)**

- Nếu cột Decision **trống** hoặc **không khớp** với bất kỳ quy tắc nào → `admis = false`
- Đây là cách tiếp cận **bảo thủ** để đảm bảo chỉ những trường hợp rõ ràng mới được coi là đậu

## Ví Dụ Thực Tế

```javascript
// Các trường hợp ĐẬU (admis = true)
"Admis" ✅
"Réussi" ✅
"R" ✅
"A" ✅
"Validé" ✅
"Success" ✅

// Các trường hợp SESSIONN (admis = false)
"Sessionnaire" ❌
"Sessionn" ❌
"Rattrapage" ❌

// Các trường hợp RỚT (admis = false)
"Échec" ❌
"Échoué" ❌
"Failed" ❌

// Các trường hợp MẶC ĐỊNH (admis = false)
"" (trống) ❌
"Unknown" ❌
"Pending" ❌
```

## Tính Năng Hỗ Trợ

### 1. **API Debug (`/api/admin/debug-admis`)**

- Phân tích dữ liệu hiện có
- Tìm các bản ghi không nhất quán
- Hiển thị tỷ lệ thống kê

### 2. **API Fix (`/api/admin/fix-admis`)**

- **Dry Run**: Kiểm tra trước khi sửa
- **Fix**: Áp dụng logic mới cho dữ liệu cũ
- Cập nhật hàng loạt

### 3. **UI Admin Panel**

- Nút "Analyser Logique Admis"
- Nút "Test Correction Admis"
- Nút "Corriger Logique Admis"

## Lợi Ích

1. **Tự Động Hóa**: Không cần cột `admis` riêng biệt trong Excel
2. **Linh Hoạt**: Hỗ trợ nhiều định dạng text khác nhau
3. **Đáng Tin Cậy**: Logic rõ ràng và có thể kiểm tra
4. **Bảo Thủ**: Chỉ những trường hợp rõ ràng mới được coi là đậu
5. **Có Thể Sửa**: API để sửa lại dữ liệu cũ nếu cần

## Cách Sử Dụng

1. **Upload File Excel** với cột `Decision`
2. Hệ thống **tự động** áp dụng logic
3. **Kiểm tra** kết quả qua API debug
4. **Sửa** dữ liệu cũ nếu cần qua API fix

## Ghi Chú Kỹ Thuật

- Logic **không phân biệt chữ hoa/thường**
- Logic **loại bỏ khoảng trắng** thừa
- Logic **ưu tiên** explicit admission trước
- Logic **bảo thủ** với các trường hợp không rõ ràng
