import MySQLdb
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}
db = MySQLdb.connect(**db_config)
cur = db.cursor()
cur.execute('SELECT COUNT(*) FROM berita')
print(f"Berita: {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM jadwal')
print(f"Jadwal: {cur.fetchone()[0]}")
cur.execute('SELECT COUNT(*) FROM kehadiran')
print(f"Kehadiran: {cur.fetchone()[0]}")
db.close()
