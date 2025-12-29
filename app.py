from flask import Flask, render_template, request, redirect, url_for, flash, session
import MySQLdb
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import MySQLdb

app = Flask(__name__)
app.secret_key = 'supersecretkey' # Change this for production

# Database Configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'passwd': '',
    'db': 'sistem_kehadiran'
}

def get_db():
    try:
        return MySQLdb.connect(**db_config)
    except Exception as e:
        print(f"Database Connection Error: {e}")
        return None

# Raw Database Connection Test on Startup
conn = get_db()
if conn:
    print("[\u2713] Database Connection Successful")
    conn.close()
else:
    print("[\u2717] Database Connection Failed")

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            flash('Silakan login terlebih dahulu.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        identifier = request.form['identifier']
        password = request.form['password']
        
        db = get_db()
        if db is None:
            flash('Gagal menyambung ke database.', 'danger')
            return render_template('login.html')
            
        try:
            cur = db.cursor()
            cur.execute("SELECT id, password_hash, nama_lengkap FROM admins WHERE email = %s OR id = %s", (identifier, identifier))
            user = cur.fetchone()
            cur.close()
            db.close()
            
            if user and check_password_hash(user[1], password):
                session['logged_in'] = True
                session['admin_id'] = user[0]
                session['admin_name'] = user[2]
                flash(f'Selamat datang kembali, {user[2]}!', 'success')
                return redirect(url_for('admin'))
            else:
                flash('ID/Email atau Kata Sandi salah.', 'danger')
        except Exception as e:
            flash(f'Kesalahan Database: {str(e)}', 'danger')
            print(f"Database Error: {e}")
            
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    nama = request.form['nama']
    email = request.form['email']
    gender = request.form['gender']
    status_role = request.form['status_role']
    password = request.form['password']
    confirm_password = request.form['confirm_password']
    
    if password != confirm_password:
        flash('Konfirmasi kata sandi tidak cocok.', 'danger')
        return redirect(url_for('login'))
    
    hashed_password = generate_password_hash(password)
    
    db = get_db()
    if db is None:
        flash('Gagal menyambung ke database.', 'danger')
        return redirect(url_for('login'))
        
    try:
        cur = db.cursor()
        cur.execute("INSERT INTO admins (nama_lengkap, email, gender, status_role, password_hash) VALUES (%s, %s, %s, %s, %s)", 
                    (nama, email, gender, status_role, hashed_password))
        db.commit()
        cur.close()
        db.close()
        flash('Akun berhasil dibuat! Silakan masuk.', 'success')
    except Exception as e:
        if db: db.close()
        flash(f'Pendaftaran gagal: {str(e)}', 'danger')
        print(f"Registration Error: {e}")
        
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    flash('Anda telah keluar.', 'info')
    return redirect(url_for('login'))

@app.route('/admin')
@login_required
def admin():
    return render_template('admin.html')

@app.route('/laporan')
@login_required
def laporan():
    return render_template('laporan.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/calendar')
def calendar():
    return render_template('calendar.html')

@app.route('/maintenance')
def maintenance():
    return render_template('maintenance.html')

if __name__ == '__main__':
    app.run(debug=True)
