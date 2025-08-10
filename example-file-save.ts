// Ví dụ nếu muốn lưu file vật lý trên server
import fs from 'fs'
import path from 'path'

// Thêm vào API upload route.ts
async function saveFileToServer(file: File, year: number, examType: string) {
    // Tạo thư mục upload nếu chưa có
    const uploadDir = path.join(process.cwd(), 'uploads', String(year), examType)
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Tạo tên file với timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${examType}_${year}_${timestamp}.xlsx`
    const filePath = path.join(uploadDir, fileName)

    // Lưu file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    console.log('📁 File saved to:', filePath)
    return filePath
}

// Sử dụng trong API:
// const savedFilePath = await saveFileToServer(file, year, examType)
