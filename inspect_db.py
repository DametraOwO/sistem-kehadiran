import MySQLdb

db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}

try:
    db = MySQLdb.connect(**db_config)
    cur = db.cursor()
    
    tables = ['berita', 'jadwal', 'kehadiran', 'kelas', 'santri']
    for table in tables:
        print(f"\nStructure of {table}:")
        try:
            cur.execute(f"DESCRIBE {table}")
            for row in cur.fetchall():
                print(row)
        except Exception as e:
            print(f"Error describing {table}: {e}")
            
    cur.close()
    db.close()
except Exception as e:
    print(f"Error: {e}")
