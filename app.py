from flask import Flask, render_template, request, redirect, url_for, flash, session
import MySQLdb
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import os
import MySQLdb

app = Flask(__name__)
app.secret_key = 'supersecretkey' # Change this for production

# Upload Configuration
UPLOAD_FOLDER = 'static/uploads/berita'
UPLOAD_PROFIL_FOLDER = 'static/uploads/profil'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['UPLOAD_PROFIL_FOLDER'] = UPLOAD_PROFIL_FOLDER

# Create upload directories if they don't exist
for folder in [UPLOAD_FOLDER, UPLOAD_PROFIL_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
    db = get_db()
    berita_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                ORDER BY b.created_at DESC
            """)
            berita_list = cur.fetchall()
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching news: {e}")
            
    return render_template('index.html', berita_list=berita_list)

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
    db = get_db()
    berita_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                ORDER BY b.created_at DESC
            """)
            berita_list = cur.fetchall()
            cur.close()
            
            # Fetch current admin data for dashboard (profile pic, etc)
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("SELECT * FROM admins WHERE id = %s", (session.get('admin_id'),))
            admin_data = cur.fetchone()
            cur.close()
            
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching news for admin: {e}")
            admin_data = None
            
    return render_template('admin.html', berita_list=berita_list, admin=admin_data)

@app.route('/laporan')
@login_required
def laporan():
    return render_template('laporan.html')

@app.route('/profil')
@login_required
def profil():
    admin_id = session.get('admin_id')
    db = get_db()
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("SELECT * FROM admins WHERE id = %s", (admin_id,))
            admin_data = cur.fetchone()
            cur.close()
            db.close()
            if admin_data:
                return render_template('profil.html', admin=admin_data)
        except Exception as e:
            if db: db.close()
            flash(f'Error: {str(e)}', 'danger')
    return redirect(url_for('admin'))

@app.route('/update_profil', methods=['POST'])
@login_required
def update_profil():
    admin_id = session.get('admin_id')
    nama = request.form['nama_lengkap']
    email = request.form['email']
    gender = request.form['gender']
    new_password = request.form.get('new_password')
    
    db = get_db()
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("SELECT foto_profil FROM admins WHERE id = %s", (admin_id,))
            current_admin = cur.fetchone()
            
            filename = current_admin['foto_profil']
            if 'foto_profil' in request.files:
                file = request.files['foto_profil']
                if file and file.filename != '' and allowed_file(file.filename):
                    if filename:
                        old_path = os.path.join(app.config['UPLOAD_PROFIL_FOLDER'], filename)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    
                    from datetime import datetime
                    filename = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_PROFIL_FOLDER'], filename))

            if new_password and new_password.strip() != '':
                pass_hash = generate_password_hash(new_password)
                cur.execute("""
                    UPDATE admins 
                    SET nama_lengkap = %s, email = %s, gender = %s, foto_profil = %s, password_hash = %s 
                    WHERE id = %s
                """, (nama, email, gender, filename, pass_hash, admin_id))
            else:
                cur.execute("""
                    UPDATE admins 
                    SET nama_lengkap = %s, email = %s, gender = %s, foto_profil = %s 
                    WHERE id = %s
                """, (nama, email, gender, filename, admin_id))
            
            db.commit()
            cur.close()
            db.close()
            
            # Update session
            session['admin_name'] = nama
            flash('Profil berhasil diperbarui!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal memperbarui profil: {str(e)}', 'danger')
            
    return redirect(url_for('profil'))

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/calendar')
def calendar():
    return render_template('calendar.html')

@app.route('/maintenance')
def maintenance():
    return render_template('maintenance.html')

@app.route('/semua_berita')
def semua_berita():
    db = get_db()
    berita_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                ORDER BY b.created_at DESC
            """)
            berita_list = cur.fetchall()
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            flash(f'Error: {str(e)}', 'danger')
            return redirect(url_for('index'))
    return render_template('semua_berita.html', berita_list=berita_list)

@app.route('/berita/<int:id>')
def berita_detail(id):
    db = get_db()
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                WHERE b.id = %s
            """, (id,))
            berita = cur.fetchone()
            cur.close()
            db.close()
            
            if berita:
                return render_template('berita_detail.html', berita=berita)
            else:
                flash('Berita tidak ditemukan.', 'warning')
                return redirect(url_for('index'))
        except Exception as e:
            if db: db.close()
            flash(f'Error: {str(e)}', 'danger')
            return redirect(url_for('index'))
    return redirect(url_for('index'))

@app.route('/edit_berita/<int:id>', methods=['POST'])
@login_required
def edit_berita(id):
    judul = request.form['judul']
    konten = request.form['konten']
    admin_id = session.get('admin_id')
    
    db = get_db()
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Verify ownership
            cur.execute("SELECT penulis_id, gambar FROM berita WHERE id = %s", (id,))
            berita = cur.fetchone()
            
            if not berita or berita['penulis_id'] != admin_id:
                cur.close()
                db.close()
                flash('Anda tidak memiliki izin untuk mengedit berita ini.', 'danger')
                return redirect(url_for('admin'))

            filename = berita['gambar']
            if 'gambar' in request.files:
                file = request.files['gambar']
                if file and file.filename != '' and allowed_file(file.filename):
                    # Delete old image if exists
                    if filename:
                        old_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                            
                    filename = secure_filename(file.filename)
                    from datetime import datetime
                    filename = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + filename
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            cur.execute("UPDATE berita SET judul = %s, konten = %s, gambar = %s, kategori = %s WHERE id = %s", 
                        (judul, konten, filename, request.form.get('kategori', 'Berita Madrasah'), id))
            db.commit()
            cur.close()
            db.close()
            flash('Berita berhasil diperbarui!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal mengedit berita: {str(e)}', 'danger')
    
    return redirect(url_for('admin'))
@app.route('/hapus_berita/<int:id>', methods=['POST'])
@login_required
def hapus_berita(id):
    admin_id = session.get('admin_id')
    db = get_db()
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Verify ownership
            cur.execute("SELECT penulis_id, gambar FROM berita WHERE id = %s", (id,))
            berita = cur.fetchone()
            
            if not berita or berita['penulis_id'] != admin_id:
                cur.close()
                db.close()
                flash('Anda tidak memiliki izin untuk menghapus berita ini.', 'danger')
                return redirect(url_for('admin'))

            # Delete image file if exists
            if berita['gambar']:
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], berita['gambar'])
                if os.path.exists(file_path):
                    os.remove(file_path)

            cur.execute("DELETE FROM berita WHERE id = %s", (id,))
            db.commit()
            cur.close()
            db.close()
            flash('Berita berhasil dihapus!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menghapus berita: {str(e)}', 'danger')
            
    return redirect(url_for('admin'))

@app.route('/tambah_berita', methods=['POST'])
@login_required
def tambah_berita():
    judul = request.form['judul']
    konten = request.form['konten']
    penulis_id = session.get('admin_id')
    
    filename = None
    if 'gambar' in request.files:
        file = request.files['gambar']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to filename to prevent collisions
            from datetime import datetime
            filename = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + filename
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            kategori = request.form.get('kategori', 'Berita Madrasah')
            cur.execute("INSERT INTO berita (judul, konten, gambar, penulis_id, kategori) VALUES (%s, %s, %s, %s, %s)", 
                        (judul, konten, filename, penulis_id, kategori))
            db.commit()
            cur.close()
            db.close()
            flash('Berita berhasil ditambahkan!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menambahkan berita: {str(e)}', 'danger')
    else:
        flash('Gagal menyambung ke database.', 'danger')
        
    return redirect(url_for('admin'))

if __name__ == '__main__':
    app.run(debug=True)
