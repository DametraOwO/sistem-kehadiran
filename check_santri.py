import MySQLdb
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}
db = MySQLdb.connect(**db_config)
cur = db.cursor()
cur.execute('SELECT COUNT(*) FROM santri')
print(f"SANTRI_COUNT:{cur.fetchone()[0]}")
db.close()
