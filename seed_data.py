import MySQLdb
import random

db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}

first_names_boy = ["Ahmad", "Muhammad", "Ali", "Yusuf", "Ibrahim", "Ismail", "Ziyad", "Fathir", "Azzam", "Fawwaz", "Haikal", "Rayyan", "Fatih", "Zaid", "Umar", "Hamzah", "Bilal", "Thariq", "Ghaffar", "Daffa"]
first_names_girl = ["Siti", "Fatimah", "Aisha", "Khadijah", "Zahra", "Nayla", "Hana", "Safira", "Amira", "Humaira", "Kayla", "Zaskia", "Alya", "Kamila", "Syifa", "Latifah", "Salma", "Nadia", "Balqis", "Yasmin"]
last_names = ["Saputra", "Pratama", "Hidayat", "Wijaya", "Kurniawan", "Ramadhan", "Santoso", "Putra", "Putri", "Az-Zahra", "Maulana", "Irawan", "Fauzi", "Sholeh", "Habibi", "Nugroho", "Setiawan", "Utomo"]

def generate_name(gender):
    if gender == 'L':
        return f"{random.choice(first_names_boy)} {random.choice(last_names)}"
    else:
        return f"{random.choice(first_names_girl)} {random.choice(last_names)}"

try:
    db = MySQLdb.connect(**db_config)
    cur = db.cursor()
    
    print("Clearing existing sample students (optional)...")
    # Uncomment if you want to start fresh: 
    # cur.execute("DELETE FROM santri")
    
    count = 0
    # Classes 1 to 6
    for kelas_id in range(1, 7):
        print(f"Generating students for Class {kelas_id}...")
        for i in range(1, 11):
            gender = random.choice(['L', 'P'])
            nama = generate_name(gender)
            # Generate NIS: Year(25) + Kelas(01-06) + Index(01-10)
            nis = f"25{str(kelas_id).zfill(2)}{str(i).zfill(2)}"
            
            try:
                cur.execute("""
                    INSERT INTO santri (nis, nama_lengkap, gender, id_kelas) 
                    VALUES (%s, %s, %s, %s)
                """, (nis, nama, gender, kelas_id))
                count += 1
            except MySQLdb.IntegrityError:
                print(f"Skipping NIS {nis} (already exists)")
                
    db.commit()
    print(f"Successfully added {count} sample students!")
    cur.close()
    db.close()

except Exception as e:
    print(f"Error: {e}")
