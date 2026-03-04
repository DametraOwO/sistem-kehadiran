# Dokumentasi Proyek: Sistem Kehadiran Madrasah Digital

## 1. Ikhtisar Proyek
**Nama**: Sistem Kehadiran Madrasah Digital
**Deskripsi**: Aplikasi berbasis web yang dirancang untuk madrasah guna mengelola kehadiran santri, data akademik, jadwal pelajaran, dan berita sekolah. Sistem ini memiliki dashboard admin berbasis peran (Role-Based), pencatatan kehadiran real-time, dan pelaporan otomatis.

## 2. Teknologi (Tech Stack)

### Backend (Sisi Server)
- **Bahasa**: Python 3.x
- **Framework**: Flask (Microframework)
- **Database Driver**: `flask-mysqldb` (Klien MySQL)
- **Keamanan**:
    - `Flask-WTF` (Perlindungan CSRF)
    - `Werkzeug Security` (Hashing Kata Sandi)
- **Utilitas**: `datetime`, `os`, `json`, `calendar`

### Frontend (Antarmuka Pengguna)
- **Markup**: HTML5 (Template Jinja2)
- **Styling**: Tailwind CSS (via CDN)
- **Scripting**: Vanilla JavaScript (ES6+)
- **Ikon**: Material Symbols Outlined (Google Fonts)
- **Font**: Plus Jakarta Sans

### Database
- **Sistem**: MySQL / MariaDB
- **Tabel Utama**: `admins`, `santri`, `kelas`, `kehadiran`, `berita`, `jadwal`

## 3. Struktur Proyek

```text
KP Sistem kehadiran/
├── app.py                  # Titik Masuk Utama Aplikasi (Rute & Logika)
├── requirements.txt        # Dependensi Python
├── database/               # Skrip/Backup Database
├── static/                 # Aset Statis
│   ├── css/               # Gaya Kustom
│   ├── js/                # Logika Sisi Klien
│   │   ├── admin.js       # Interaksi Dashboard
│   │   ├── login.js       # Auth & Lupa Password
│   │   ├── security.js    # Perlindungan Sisi Klien
│   │   └── ...            # Skrip fitur lainnya
│   └── uploads/           # Konten Unggahan Pengguna
│       ├── berita/        # Gambar Berita
│       └── profil/        # Foto Profil Pengguna
└── templates/              # Template HTML (Jinja2)
    ├── index.html         # Halaman Utama Publik
    ├── admin.html         # Dashboard Admin
    ├── catat_kehadiran.html # Pencatatan Kehadiran
    ├── manage_jadwal.html # Manajemen Jadwal
    └── ...                # Tampilan lainnya
```

## 4. Implementasi Keamanan

### Keamanan Server (Kritis)
1.  **Perlindungan CSRF**:
    - Diimplementasikan menggunakan `Flask-WTF`.
    - Semua form POST menyertakan `csrf_token` tersembunyi.
    - Permintaan AJAX mengirimkan header `X-CSRFToken`.
2.  **Autentikasi & Otorisasi**:
    - Dekorator `@login_required` mengamankan rute admin.
    - **Kontrol Akses Berbasis Peran (RBAC)** diterapkan secara ketat di backend.
3.  **Keamanan Kata Sandi**:
    - Kata sandi **tidak pernah** disimpan dalam teks biasa.
    - Di-hash menggunakan `pbkdf2:sha256` melalui `generate_password_hash`.
4.  **Manajemen Sesi**:
    - `app.permanent_session_lifetime` diatur ke 30 hari.
    - `secret_key` dimuat dari Variabel Lingkungan (Produksi) atau fallback dev.
5.  **Pencegahan Injeksi SQL**:
    - Semua kueri database menggunakan **Parameterisasi Kueri** (contoh: placeholder `%s`) untuk mencegah serangan injeksi.

### Keamanan Sisi Klien (Pencegahan)
1.  **`security.js`**:
    - Menonaktifkan Klik Kanan (Context Menu).
    - Mencegah penggunaan pintasan F12 dan Ctrl+Shift+I untuk mempersulit inspeksi kode sumber.

## 5. Fitur Utama & Hak Akses Pengguna (Use Cases)

Sistem ini membagi hak akses menjadi 4 peran utama dengan batasan sebagai berikut:

### 1. Admin
Memiliki hak akses penuh (Super User) terhadap seluruh sistem:
- **Manajemen Santri**: Dapat melihat, menambahkan, mengubah, dan menghapus data santri.
- **Kehadiran**: Dapat merekap dan mencatat kehadiran santri.
- **Berita/Postingan**: Dapat melihat, menambahkan, mengubah, dan menghapus seluruh data postingan/berita (termasuk milik pengguna lain).
- **Jadwal**: Dapat melihat, menambahkan, mengubah, dan menghapus data jadwal pelajaran.
- **Laporan**: Dapat melihat dan mengunduh data laporan rekapitulasi kehadiran.
- **Profil**: Dapat melihat dan mengubah pengaturan profil sendiri (foto, password, nama).

### 2. Guru
Memiliki hak akses yang hampir sama dengan Admin, namun dengan batasan pada konten berita:
- **Hak Akses Umum**: Sama seperti Admin (Santri, Kehadiran, Jadwal, Laporan).
- **Berita/Postingan**: Guru **hanya bisa mengedit/menghapus postingan yang dibuat oleh dirinya sendiri**. Guru tidak dapat memodifikasi berita yang dibuat oleh Admin atau Guru lain.

### 3. Ketua Murid
Memiliki hak akses terbatas, difokuskan untuk membantu operasional harian kelas:
- **Pencatatan Kehadiran**: Tombol "+" atau menu tambah hanya memunculkan opsi untuk mencatat kehadiran.
- **Data Santri**: Hanya bisa **melihat** daftar santri (Read-Only). Tidak bisa menambahkan, mengubah, atau menghapus data.
- **Berita/Postingan**: Hanya bisa **melihat** daftar berita (Read-Only). Tidak bisa membuat atau memodifikasi berita.
- **Jadwal**: Hanya bisa **melihat** jadwal pelajaran (Read-Only). Tidak bisa memodifikasi jadwal.
- **Laporan**: Dapat melihat dan mengunduh data laporan rekapitulasi kehadiran.
- **Profil**: Dapat melihat dan mengubah pengaturan profil sendiri.

### 4. Umum (Tanpa Login)
Pengguna tanpa akun (wali murid, masyarakat umum) memiliki akses yang sangat terbatas:
- **Halaman yang Dapat Diakses**:
    1.  `index.html` (Landing Page / Beranda)
    2.  `calendar.html` (Kalender Akademik)
    3.  `about.html` (Tentang Madrasah)
- **Batasan**: Tidak dapat mengakses dashboard, data santri detail, atau fitur administratif apapun.

## 6. Dokumentasi API (Internal)

### Publik / Auth
- `GET /` : Halaman Utama.
- `GET /about` : Profil Sekolah.
- `GET /login` : Halaman Login.
- `POST /login` : Logika Pemrosesan Login.
- `POST /register` : Membuat Akun Baru.
- `GET /logout` : Mengakhiri Sesi.

### Fitur Admin
- `GET /admin` : Dashboard Utama.
- `POST /tambah_santri` : Menambah Santri Baru.
- `POST /hapus_santri/<id>` : Menghapus Santri.
- `POST /tambah_jadwal` : Menambah Jadwal.
- `POST /tambah_berita` : Mempublikasikan Berita.

### Endpoint AJAX / JSON
- `GET /api/cari_santri?q=...` : Pencarian santri (Mengembalikan JSON).
- `POST /simpan_absensi` : Menyimpan daftar kehadiran (Payload JSON).
- `POST /api/verify_reset` : Cek email untuk reset password.
- `POST /api/reset_password` : Simpan password baru.

## 7. Tinjauan Skema Database

| Tabel | Deskripsi | Kolom Kunci |
| :--- | :--- | :--- |
| `admins` | Pengguna Aplikasi | `id`, `nama_lengkap`, `email`, `password_hash`, `role` |
| `kelas` | Data Kelas | `id`, `nama_kelas` |
| `santri` | Data Siswa | `id`, `nis`, `nama_lengkap`, `gender`, `id_kelas` |
| `kehadiran` | Log Kehadiran | `id`, `id_santri`, `status`, `tanggal`, `waktu` |
| `berita` | Postingan Berita | `id`, `judul`, `konten`, `gambar`, `kategori`, `penulis_id` |
| `jadwal` | Jadwal Pelajaran | `id`, `id_kelas`, `hari`, `mata_pelajaran`, `jam_mulai` |

---

## 8. Panduan Instalasi & Menjalankan Proyek

Bagian ini penting untuk dipahami oleh pengembang atau administrator sistem yang ingin menjalankan aplikasi ini di komputer lokal (localhost) atau server.

### Prasyarat (Requirements)
Sebelum memulai, pastikan komputer Anda telah terinstal:
- **Python 3.x** (Bahasa pemrograman utama).
- **MySQL Server** (Database management system).
- **Git** (Opsional, untuk mengunduh kode sumber).

### Langkah-langkah Instalasi

#### 1. Clone Repository (Unduh Proyek)
Buka terminal atau command prompt, lalu jalankan perintah berikut untuk mengunduh kode program:
```bash
git clone https://github.com/DametraOwO/sistem-kehadiran-madrasah.git
cd sistem-kehadiran-madrasah
```
*Catatan: Jika Anda tidak menggunakan Git, Anda bisa mengunduh file ZIP dari repository dan mengekstraknya.*

#### 2. Install Dependensi (Pustaka Python)
Aplikasi ini membutuhkan beberapa pustaka tambahan. Pastikan Anda berada di dalam folder proyek, lalu jalankan:
```bash
pip install -r requirements.txt
```
Perintah ini akan menginstal `Flask`, `flask-mysqldb`, `Flask-WTF`, dan dependensi lainnya.

#### 3. Konfigurasi Database
1.  Bukalah aplikasi manajemen database (seperti PHPMyAdmin, DBeaver, atau MySQL Workbench).
2.  Buat database baru dengan nama `sistem_kehadiran`.
3.  Pastikan konfigurasi di file `app.py` baris `db_config` sesuai dengan kredensial database lokal Anda:
    ```python
    db_config = {
        'host': '127.0.0.1',
        'user': 'root',   # Sesuaikan dengan user database Anda
        'passwd': '',     # Sesuaikan dengan password database Anda
        'db': 'sistem_kehadiran'
    }
    ```
4.  **Import Database**: Jika tersedia file `.sql` di folder `database/`, import file tersebut ke database `sistem_kehadiran` yang baru dibuat. Jika tidak, pastikan kode aplikasi memiliki fitur *auto-create table*.

#### 4. Menjalankan Aplikasi
Setelah semua siap, jalankan aplikasi dengan perintah:
```bash
python app.py
```
Jika berhasil, terminal akan menampilkan pesan seperti:
`Running on http://127.0.0.1:5000`

#### 5. Akses di Browser
Buka browser favorit Anda (Chrome, Edge, Firefox, dll) dan kunjungi alamat:
[http://127.0.0.1:5000](http://127.0.0.1:5000)
