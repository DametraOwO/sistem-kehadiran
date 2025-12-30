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
    cur.execute("DESCRIBE admins")
    rows = cur.fetchall()
    for row in rows:
        print(row)
    db.close()
except Exception as e:
    print(e)
