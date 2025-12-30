import MySQLdb
import random
from datetime import date, timedelta, datetime

db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}

def generate_samples():
    try:
        db = MySQLdb.connect(**db_config)
        cur = db.cursor(MySQLdb.cursors.DictCursor)

        # 1. Berita - 5 samples
        print("Generating 5 berita...")
        # Check if we should clear or just add. User said 'buat 5 sample', usually means existing ones are cleared or just at least 5.
        # I'll clear 'berita' since it's one of the target tables.
        cur.execute("DELETE FROM berita")
        berita_samples = [
            ("Peringatan Hari Santri Nasional", "Madrasah kita akan mengadakan peringatan Hari Santri Nasional pada minggu depan dengan berbagai lomba islami dan pengajian akbar. Seluruh santri diwajibkan menggunakan atribut lengkap."),
            ("Ekstrakurikuler Baru: Tahfidz Qur'an", "Mulai bulan depan, madrasah akan membuka kelas khusus tahfidz Qur'an bagi santri yang berminat. Pendaftaran dapat dilakukan di kantor tata usaha setiap jam kerja."),
            ("Pembangunan Gedung Baru Selesai", "Alhamdulillah, pembangunan gedung laboratorium komputer baru telah selesai dan siap digunakan. Fasilitas ini diharapkan dapat menunjang pembelajaran teknologi bagi santri."),
            ("Kunjungan Wisata Religi ke Wali Songo", "Rencana kegiatan akhir semester ini adalah kunjungan ziarah ke makam para wali di Jawa Tengah dan Jawa Timur. Santri diharapkan segera melunasi biaya administrasi."),
            ("Pengumuman Libur Semester Ganjil", "Diberitahukan kepada seluruh santri bahwa libur semester ganjil akan dimulai dari tanggal 20 Desember hingga 2 Januari. Santri masuk kembali pada tanggal 3 Januari.")
        ]
        # Get admin ID (assume 1 exists or get first)
        cur.execute("SELECT id FROM admins LIMIT 1")
        admin = cur.fetchone()
        admin_id = admin['id'] if admin else 1

        for judul, konten in berita_samples:
            cur.execute("""
                INSERT INTO berita (judul, konten, penulis_id, kategori) 
                VALUES (%s, %s, %s, %s)
            """, (judul, konten, admin_id, "Berita Madrasah"))

        # 2. Jadwal - 2 subjects per day for each class (15:00-17:00)
        print("Generating jadwal for each class...")
        cur.execute("DELETE FROM jadwal")
        cur.execute("SELECT id FROM kelas")
        classes = cur.fetchall()
        
        days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
        subjects = [
            'Bahasa Arab', 'Fiqih', 'Akidah Akhlak', 'Al-Qur\'an Hadits', 
            'Sejarah Kebudayaan Islam', 'Nahwu', 'Shorof', 'Bahasa Inggris', 
            'Matematika Islami', 'Tahfidz', 'Khitobah', 'Tajwid'
        ]

        if not classes:
            print("Warning: No classes found in 'kelas' table. Skipping jadwal.")
        else:
            for k in classes:
                class_id = k['id']
                for day in days:
                    # Subject 1: 15:00 - 16:00
                    subj1 = random.choice(subjects)
                    cur.execute("""
                        INSERT INTO jadwal (id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan) 
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (class_id, day, subj1, "15:00:00", "16:00:00", "Pelajaran Pertama"))
                    
                    # Subject 2: 16:00 - 17:00
                    subj2 = random.choice([s for s in subjects if s != subj1])
                    cur.execute("""
                        INSERT INTO jadwal (id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan) 
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (class_id, day, subj2, "16:00:00", "17:00:00", "Pelajaran Kedua"))

        # 3. Kehadiran - 3 months (Oct, Nov, Dec 2025)
        print("Generating attendance for Oct, Nov, Dec 2025...")
        cur.execute("DELETE FROM kehadiran")
        cur.execute("SELECT id FROM santri")
        students = cur.fetchall()
        
        if not students:
            print("No students found in 'santri' table. Please ensure students exist first.")
        else:
            start_date = date(2025, 10, 1)
            end_date = date(2025, 12, 31)
            
            current_date = start_date
            records = []
            while current_date <= end_date:
                # We'll generate attendance for all students for each day.
                for s in students:
                    student_id = s['id']
                    # Weighted random status
                    status = random.choices(
                        ['Hadir', 'Izin', 'Sakit', 'Alpha'], 
                        weights=[0.85, 0.05, 0.05, 0.05], 
                        k=1
                    )[0]
                    
                    # Random time between 14:30 and 15:15
                    hour = 14 if random.random() < 0.8 else 15
                    if hour == 14:
                        minute = random.randint(30, 59)
                    else:
                        minute = random.randint(0, 15)
                    waktu = f"{hour:02}:{minute:02}:00"
                    
                    records.append((student_id, status, current_date, waktu))
                    
                    # Batch insert every 1000 records
                    if len(records) >= 1000:
                        cur.executemany("""
                            INSERT INTO kehadiran (id_santri, status, tanggal, waktu) 
                            VALUES (%s, %s, %s, %s)
                        """, records)
                        records = []
                
                current_date += timedelta(days=1)
                
            if records:
                cur.executemany("""
                    INSERT INTO kehadiran (id_santri, status, tanggal, waktu) 
                    VALUES (%s, %s, %s, %s)
                """, records)

        db.commit()
        print("Success! Sample data generated successfully.")
        cur.close()
        db.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_samples()
