# Hướng dẫn Build & Cài đặt AGV Configuration Server

Thư mục `deploy/` chứa các script để **đóng gói** và **triển khai** hệ thống quản lý cấu hình AGV lên máy chủ sản xuất.

```
deploy/
├── build.ps1       # Build React + Publish .NET → dist/
├── setup.ps1       # Wizard cài đặt & cấu hình (Windows Service)
├── deploy.ps1      # Wrapper tổng hợp (gọi setup.ps1)
└── GUIDE.md        # File hướng dẫn này
```

---

## Yêu cầu môi trường build

| Công cụ | Yêu cầu |
|---------|---------|
| .NET SDK | 10.0 trở lên |
| Node.js | 18 trở lên (có `npm`) |
| PowerShell | 5.1+ |

## Yêu cầu máy đích (Production)

| Thành phần | Ghi chú |
|-----------|---------|
| **SQL Server** | SQL Server có database `STI_TRANSPORT_34` |
| **.NET Runtime** | 10.0+ (nếu dùng framework-dependent build) |

---

## Bước 1 – Build & Đóng gói

Chạy từ **thư mục gốc** của repository:

```powershell
# Build framework-dependent (cần .NET 10 trên máy đích)
.\deploy\build.ps1

# Build self-contained (không cần .NET trên máy đích)
.\deploy\build.ps1 -SelfContained -Runtime win-x64

# Chỉ định thư mục output
.\deploy\build.ps1 -OutputDir "C:\Release\StiAgvConfig-v1.0"
```

Sau khi build xong, thư mục `dist-sti-agv-config/` sẽ có cấu trúc:

```
dist-sti-agv-config/
├── server/                     # .NET đã publish
│   ├── Server.Api.exe
│   ├── appsettings.json
│   └── wwwroot/                # React SPA (phục vụ bởi .NET)
│       ├── index.html
│       └── ...
├── deploy.ps1
├── setup.ps1
└── GUIDE.md
```

> **Giao diện web** được phục vụ trực tiếp bởi .NET trên cùng port với API – không cần Node.js trên máy sản xuất.

---

## Bước 2 – Cài đặt trên máy đích

Sao chép toàn bộ thư mục `dist/` lên máy đích. Mở **PowerShell với quyền Administrator**:

```powershell
cd C:\path\to\dist

# Chạy wizard cài đặt (khuyến nghị)
powershell -ExecutionPolicy Bypass -File deploy.ps1

# Hoặc chỉ chạy setup trực tiếp
powershell -ExecutionPolicy Bypass -File setup.ps1

# Cài vào thư mục tùy chỉnh
powershell -ExecutionPolicy Bypass -File deploy.ps1 -InstallDir D:\StiAgvConfig
```

Wizard sẽ hỏi từng thông số:

```
── Server Settings ─────────────────────────────────────
  (Press Enter to keep current/default value)

  API Server Port [8090] :
  SQL Server Connection String [Server=127.0.0.1;Database=STI_TRANSPORT_34;User Id=sti;Password=66668888;TrustServerCertificate=True] :
  Change JWT signing key (recommended for production)? [y/N] :

── Seed Accounts ─────────────────────────────────────────
  Admin Username [admin] :
  Admin Password [***] :
  Technician Username [technician] :
  Technician Password [***] :

── Web Client ───────────────────────────────────────────
  Web API Base URL (auto|http://host:port) [auto] :
  Web App Name [STI Agv Configuration] :

── Windows Service ───────────────────────────────────────
  Install 'StiAgvConfig.Server' as a Windows Service? [Y/n] :
  Start 'StiAgvConfig.Server' service now? [Y/n] :
```

Sau khi hoàn thành:
- Cấu hình ghi vào `server/appsettings.Production.json`
- Cấu hình web client ghi vào `server/wwwroot/config.json` (`API_BASE_URL`, `APP_NAME`)
- Service `StiAgvConfig.Server` luôn được đặt chế độ **Automatic** (tự khởi động cùng hệ thống)
- Truy cập Web UI tại `http://<server-ip>:8090`

---

## Cấu hình thủ công

Mọi thông số lưu tại **`server/appsettings.Production.json`** (ghi đè `appsettings.json` built-in):

```json
{
  "Urls": "http://*:8090",
  "ConnectionStrings": {
    "DefaultConnection": "Server=127.0.0.1;Database=STI_TRANSPORT_34;User Id=sti;Password=66668888;TrustServerCertificate=True"
  },
  "Jwt": {
    "Issuer": "StiAgvConfig.Server",
    "Audience": "StiAgvConfig.Web",
    "SigningKey": "your-signing-key",
    "ExpirationMinutes": 480
  },
  "SeedData": {
    "AdminUsername": "admin",
    "AdminPassword": "09052016",
    "TechnicianUsername": "technician",
    "TechnicianPassword": "09052016"
  }
}
```

---

## Quản lý Service

```powershell
# Xem trạng thái
Get-Service StiAgvConfig.Server

# Khởi động / Dừng / Khởi động lại
Start-Service   StiAgvConfig.Server
Stop-Service    StiAgvConfig.Server
Restart-Service StiAgvConfig.Server

# Xem log (Event Viewer)
Get-EventLog -LogName Application -Source StiAgvConfig.Server -Newest 50

# Gỡ cài đặt service
sc.exe delete StiAgvConfig.Server
```

---

## Chạy thủ công (không dùng Service)

```powershell
cd dist-sti-agv-config\server
$env:ASPNETCORE_ENVIRONMENT = "Production"
.\Server.Api.exe
```

---

## Cập nhật phiên bản mới

1. Build lại gói mới bằng `build.ps1`
2. Dừng service trên máy đích
3. Sao chép đè thư mục `server/` mới (**giữ nguyên** `appsettings.Production.json`)
4. Khởi động lại service

```powershell
Stop-Service StiAgvConfig.Server
Copy-Item .\dist-sti-agv-config\server\* -Destination "C:\StiAgvConfig\server\" -Recurse -Force -Exclude appsettings.Production.json
Start-Service StiAgvConfig.Server
```

---

## Cổng mặc định

| Cổng | Dịch vụ |
|------|---------|
| **8090** | STI AGV Configuration Server API + Web UI |
| 1433 | SQL Server |
