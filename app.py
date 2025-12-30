from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import MySQLdb
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import os
import calendar
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

# Disable caching to prevent back-button access after logout
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

def record_log(admin_id, kategori, pesan):
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            # Mapping based on actual schema: id, admin_id, aksi (pesan), tabel_terkait (kategori), data_id, waktu
            cur.execute("INSERT INTO log_aktivitas (admin_id, aksi, tabel_terkait) VALUES (%s, %s, %s)", 
                        (admin_id, pesan, kategori))
            db.commit()
            db.close()
        except Exception as e:
            print(f"Log Error: {e}")

@app.route('/')
def index():
    db = get_db()
    berita_list = []
    attendance_pct = 0
    jadwal_hari_ini = []
    active_jadwal = [] # Initialized early to prevent UnboundLocalError
    status_sekolah = "Tidak ada jadwal hari ini" # Default
    
    if db:
        try:
            from datetime import date, datetime
            today_date = date.today().strftime('%Y-%m-%d')
            
            # Map ISO Weekday (1=Monday, 7=Sunday) to Indonesian
            today_iso = datetime.now().isoweekday()
            days_map = {
                1: 'Senin', 2: 'Selasa', 3: 'Rabu',
                4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu'
            }
            current_day_name = days_map[today_iso]
            
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch News
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                ORDER BY b.created_at DESC
            """)
            berita_list = cur.fetchall()
            
            # Fetch overall attendance stats for today
            cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Hadir' THEN 1 ELSE 0 END) as hadir_count
                FROM kehadiran 
                WHERE tanggal = %s
            """, (today_date,))
            result = cur.fetchone()
            
            if result and result['total'] > 0:
                attendance_pct = round((result['hadir_count'] / result['total']) * 100)
            
            # Fetch Today's Schedule
            cur.execute("""
                SELECT j.id, j.id_kelas, j.hari, j.mata_pelajaran, j.keterangan, 
                       TIME_FORMAT(j.waktu_mulai, '%%H:%%i') as waktu_mulai, 
                       TIME_FORMAT(j.waktu_selesai, '%%H:%%i') as waktu_selesai, 
                       k.nama_kelas 
                FROM jadwal j
                JOIN kelas k ON j.id_kelas = k.id
                WHERE j.hari = %s
                ORDER BY j.waktu_mulai ASC
            """, (current_day_name,))
            jadwal_hari_ini = list(cur.fetchall())
            
            # Calculate School Status
            # active_jadwal = [] # Already initialized at function scope
            try:
                # Debug Info
                # print(f"DEBUG: Day={current_day_name}, Items={len(jadwal_hari_ini)}")
                
                if jadwal_hari_ini:
                    from datetime import timedelta
                    
                    # Helper to converts timedelta/time to datetime.time
                    now = datetime.now().time()
                    
                    def get_time_obj(t):
                        if isinstance(t, str):
                            # Handle string format if slightly different?
                            try:
                                return datetime.strptime(t, "%H:%M").time()
                            except:
                                try:
                                    return datetime.strptime(t, "%H:%M:%S").time()
                                except:
                                    return datetime.strptime(str(t), "%H:%M").time()
                        
                        if isinstance(t, timedelta):
                            # Convert timedelta to time (duration from midnight)
                            return (datetime.min + t).time()
                        return t
                    
                    # Sort just in case
                    jadwal_hari_ini.sort(key=lambda x: get_time_obj(x['waktu_mulai']))
                    
                    start_time = get_time_obj(jadwal_hari_ini[0]['waktu_mulai'])
                    
                    # Find max end time
                    max_end_time = datetime.min.time()
                    for j in jadwal_hari_ini:
                        s_t = get_time_obj(j['waktu_mulai'])
                        e_t = get_time_obj(j['waktu_selesai'])
                        if e_t > max_end_time:
                            max_end_time = e_t
                        
                        # Filter for active classes
                        if s_t <= now <= e_t:
                            active_jadwal.append(j)
                            
                    if now < start_time:
                        status_sekolah = "Pembelajaran belum dimulai"
                    elif now > max_end_time:
                        status_sekolah = "Pembelajaran telah berakhir"
                    else:
                        status_sekolah = "Pembelajaran sedang berlangsung"
                else:
                     status_sekolah = f"Tidak ada KBM hari ini ({current_day_name})"

            except Exception as e:
                status_sekolah = f"Error Calc: {str(e)}"
            
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            status_sekolah = f"DB/General Error: {str(e)}"
            print(f"Error fetching data for index: {e}")
            
    return render_template('index.html', berita_list=berita_list, attendance_pct=attendance_pct, jadwal_hari_ini=active_jadwal, status_sekolah=status_sekolah)

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
            cur.execute("SELECT id, password_hash, nama_lengkap, status_role FROM admins WHERE email = %s OR id = %s", (identifier, identifier))
            user = cur.fetchone()
            cur.close()
            db.close()
            
            if user and check_password_hash(user[1], password):
                session['logged_in'] = True
                session['admin_id'] = user[0]
                session['admin_name'] = user[2]
                session['admin_role'] = user[3]
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
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin():
    db = get_db()
    berita_list = []
    stats = {'hadir': 0, 'izin': 0, 'sakit': 0, 'alpha': 0, 
             'hadir_pct': 0, 'izin_pct': 0, 'sakit_pct': 0, 'alpha_pct': 0,
             'total_kelas': 0, 'kelas_terisi': 0}
    
    if db:
        try:
            from datetime import date
            today = date.today().strftime('%Y-%m-%d')
            
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            
            # Fetch News
            cur.execute("""
                SELECT b.*, a.nama_lengkap as penulis 
                FROM berita b 
                JOIN admins a ON b.penulis_id = a.id 
                ORDER BY b.created_at DESC
            """)
            berita_list = cur.fetchall()
            
            # Fetch current admin data
            cur.execute("SELECT * FROM admins WHERE id = %s", (session.get('admin_id'),))
            admin_data = cur.fetchone()
            
            # Fetch Attendance Stats for Today
            cur.execute("""
                SELECT status, COUNT(*) as count 
                FROM kehadiran 
                WHERE tanggal = %s 
                GROUP BY status
            """, (today,))
            rows = cur.fetchall()
            
            total = 0
            for row in rows:
                status = row['status'].lower()
                count = row['count']
                stats[status] = count
                total += count
            
            if total > 0:
                stats['hadir_pct'] = round((stats['hadir'] / total) * 100, 1)
                stats['izin_pct'] = round((stats['izin'] / total) * 100, 1)
                stats['sakit_pct'] = round((stats['sakit'] / total) * 100, 1)
                stats['alpha_pct'] = round((stats['alpha'] / total) * 100, 1)
            
            # Count Attendance Progress
            cur.execute("SELECT COUNT(*) as total FROM kelas")
            total_kelas = cur.fetchone()['total']
            
            # Count classes that have at least one attendance record today
            cur.execute("""
                SELECT COUNT(DISTINCT s.id_kelas) as terisi 
                FROM kehadiran kh 
                JOIN santri s ON kh.id_santri = s.id 
                WHERE kh.tanggal = %s
            """, (today,))
            kelas_terisi = cur.fetchone()['terisi']
            
            stats['total_kelas'] = total_kelas
            stats['kelas_terisi'] = kelas_terisi
            
            # --- NEW: Fetch Class Cards Data ---
            from datetime import datetime
            today_iso = datetime.now().isoweekday()
            days_map = {
                1: 'Senin', 2: 'Selasa', 3: 'Rabu',
                4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 7: 'Minggu'
            }
            current_day_name = days_map[today_iso]
            
            cur.execute("""
                SELECT 
                    k.nama_kelas, 
                    TIME_FORMAT(MIN(j.waktu_mulai), '%%H:%%i') as waktu_mulai,
                    GROUP_CONCAT(j.mata_pelajaran ORDER BY j.waktu_mulai ASC SEPARATOR ' - ') as mata_pelajaran,
                    (SELECT COUNT(*) FROM santri s WHERE s.id_kelas = k.id) as kapasitas
                FROM jadwal j
                JOIN kelas k ON j.id_kelas = k.id
                WHERE j.hari = %s
                GROUP BY k.id, k.nama_kelas
                ORDER BY waktu_mulai ASC
            """, (current_day_name,))
            class_cards = cur.fetchall()
            
            # --- NEW: Fetch Recent Activity Logs ---
            cur.execute("""
                SELECT aksi, TIME_FORMAT(waktu, '%H:%i') as waktu_formatted 
                FROM log_aktivitas 
                ORDER BY waktu DESC 
                LIMIT 10
            """)
            recent_logs = cur.fetchall()
            
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching data for admin dashboard: {e}")
            admin_data = None
            class_cards = []
            recent_logs = []
            
    return render_template('admin.html', berita_list=berita_list, admin=admin_data, stats=stats, class_cards=class_cards, recent_logs=recent_logs)

@app.route('/laporan')
@login_required
def laporan():
    db = get_db()
    kelas_list = []
    available_months = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch classes
            cur.execute("SELECT * FROM kelas ORDER BY nama_kelas ASC")
            kelas_list = cur.fetchall()
            
            # Fetch available months from attendance
            cur.execute("""
                SELECT DISTINCT DATE_FORMAT(tanggal, '%Y-%m') as month_val, 
                       DATE_FORMAT(tanggal, '%M %Y') as month_label 
                FROM kehadiran 
                ORDER BY tanggal DESC
            """)
            raw_months = cur.fetchall()
            
            # Translate to Indonesian
            month_map = {
                'January': 'Januari', 'February': 'Februari', 'March': 'Maret',
                'April': 'April', 'May': 'Mei', 'June': 'Juni',
                'July': 'Juli', 'August': 'Agustus', 'September': 'September',
                'October': 'Oktober', 'November': 'November', 'December': 'Desember'
            }
            
            available_months = []
            for m in raw_months:
                label = m['month_label']
                for eng, ind in month_map.items():
                    if eng in label:
                        label = label.replace(eng, ind)
                        break
                available_months.append({
                    'month_val': m['month_val'],
                    'month_label': label
                })
            
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error initializing laporan: {e}")
            
    # Calculate Academic Year & Semester
    from datetime import datetime
    now = datetime.now()
    month = now.month
    year = now.year
    
    if month >= 7:
        semester = "Ganjil"
        akad = f"{year}/{year + 1}"
    else:
        semester = "Genap"
        akad = f"{year - 1}/{year}"
            
    return render_template('laporan.html', kelas_list=kelas_list, available_months=available_months, 
                           current_semester=semester, current_akad=akad)

@app.route('/api/laporan_stats')
@login_required
def api_laporan_stats():
    month = request.args.get('month') # Format YYYY-MM
    kelas_id = request.args.get('kelas_id')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort', 'name_asc')
    
    if not month:
        return jsonify({'success': False, 'message': 'Bulan harus dipilih'}), 400
        
    db = get_db()
    if not db:
        return jsonify({'success': False, 'message': 'Gagal menyambung database'}), 500
        
    try:
        cur = db.cursor(MySQLdb.cursors.DictCursor)
        from datetime import datetime, timedelta
        
        # Parse current month and previous month
        current_date = datetime.strptime(month, '%Y-%m')
        # Simple previous month calculation
        first_of_month = current_date.replace(day=1)
        prev_month_date = (first_of_month - timedelta(days=1)).replace(day=1)
        prev_month = prev_month_date.strftime('%Y-%m')
        
        def get_stats(m, k_id):
            query = """
                SELECT 
                    status, 
                    COUNT(*) as count
                FROM kehadiran kh
                JOIN santri s ON kh.id_santri = s.id
                WHERE DATE_FORMAT(kh.tanggal, '%%Y-%%m') = %s
            """
            params = [m]
            if k_id and k_id != 'all':
                query += " AND s.id_kelas = %s"
                params.append(k_id)
            query += " GROUP BY status"
            
            cur.execute(query, params)
            rows = cur.fetchall()
            
            stats = {'Hadir': 0, 'Izin': 0, 'Sakit': 0, 'Alpha': 0, 'total': 0}
            for r in rows:
                stats[r['status']] = r['count']
                stats['total'] += r['count']
            
            res = {}
            for s in ['Hadir', 'Izin', 'Sakit', 'Alpha']:
                pct = (stats[s] / stats['total'] * 100) if stats['total'] > 0 else 0
                res[s] = {'count': stats[s], 'pct': round(pct, 1)}
            res['total'] = stats['total']
            return res

        curr_stats = get_stats(month, kelas_id)
        prev_stats = get_stats(prev_month, kelas_id)
        
        # Calculate trends
        trends = {}
        for s in ['Hadir', 'Izin', 'Sakit', 'Alpha']:
            diff = curr_stats[s]['pct'] - prev_stats[s]['pct']
            if diff > 0:
                trends[s] = f"+{round(diff, 1)}%"
                trends[s + '_status'] = 'up'
            elif diff < 0:
                trends[s] = f"{round(diff, 1)}%"
                trends[s + '_status'] = 'down'
            else:
                trends[s] = "Stabil"
                trends[s + '_status'] = 'stable'

        # Fetch Detailed Student List for the month
        list_query = """
            SELECT 
                s.id, s.nis, s.nama_lengkap, s.gender, k.nama_kelas,
                COUNT(kh.id) as total_hari,
                SUM(CASE WHEN kh.status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN kh.status = 'Izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN kh.status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN kh.status = 'Alpha' THEN 1 ELSE 0 END) as alpha
            FROM santri s
            LEFT JOIN kelas k ON s.id_kelas = k.id
            LEFT JOIN kehadiran kh ON s.id = kh.id_santri AND DATE_FORMAT(kh.tanggal, '%%Y-%%m') = %s
            WHERE 1=1
        """
        list_params = [month]
        
        if kelas_id and kelas_id != 'all':
            list_query += " AND s.id_kelas = %s"
            list_params.append(kelas_id)
            
        if search:
            list_query += " AND (s.nama_lengkap LIKE %s OR s.nis LIKE %s)"
            list_params.extend([f"%{search}%", f"%{search}%"])
            
        list_query += " GROUP BY s.id"
        
        # Apply Sorting
        sort_map = {
            'name_asc': 'ORDER BY s.nama_lengkap ASC',
            'name_desc': 'ORDER BY s.nama_lengkap DESC',
            'hadir_desc': 'ORDER BY hadir DESC, s.nama_lengkap ASC',
            'izin_desc': 'ORDER BY izin DESC, s.nama_lengkap ASC',
            'sakit_desc': 'ORDER BY sakit DESC, s.nama_lengkap ASC',
            'alpha_desc': 'ORDER BY alpha DESC, s.nama_lengkap ASC'
        }
        list_query += " " + sort_map.get(sort_by, sort_map['name_asc'])
        
        cur.execute(list_query, list_params)
        students = cur.fetchall()
        
        cur.close()
        db.close()
        
        return jsonify({
            'success': True,
            'stats': curr_stats,
            'trends': trends,
            'students': students
        })
    except Exception as e:
        if db: db.close()
        print(f"API Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/rekap_laporan')
@login_required
def rekap_laporan():
    month_val = request.args.get('month') # YYYY-MM
    kelas_id = request.args.get('kelas_id')
    sort_by = request.args.get('sort', 'name_asc')
    
    if not month_val:
        return "Bulan harus dipilih", 400
        
    db = get_db()
    if not db:
        return "Gagal menyambung database", 500
        
    try:
        cur = db.cursor(MySQLdb.cursors.DictCursor)
        from datetime import datetime
        import calendar
        
        # Calculate days in month
        year, month = map(int, month_val.split('-'))
        days_in_month = calendar.monthrange(year, month)[1]
        
        # Translate month for title
        month_names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                       "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        current_month_label = f"{month_names[month-1]} {year}"
        
        # Academic Title
        if month >= 7:
            semester = "Ganjil"
            akad = f"{year}/{year + 1}"
        else:
            semester = "Genap"
            akad = f"{year - 1}/{year}"
        academic_title = f"Semester {semester} {akad}"

        # Fetch students and their monthly summary
        list_query = """
            SELECT 
                s.id, s.nis, s.nama_lengkap, k.nama_kelas,
                SUM(CASE WHEN kh.status = 'Hadir' THEN 1 ELSE 0 END) as hadir,
                SUM(CASE WHEN kh.status = 'Izin' THEN 1 ELSE 0 END) as izin,
                SUM(CASE WHEN kh.status = 'Sakit' THEN 1 ELSE 0 END) as sakit,
                SUM(CASE WHEN kh.status = 'Alpha' THEN 1 ELSE 0 END) as alpha
            FROM santri s
            LEFT JOIN kelas k ON s.id_kelas = k.id
            LEFT JOIN kehadiran kh ON s.id = kh.id_santri AND DATE_FORMAT(kh.tanggal, '%%Y-%%m') = %s
            WHERE 1=1
        """
        list_params = [month_val]
        if kelas_id and kelas_id != 'all':
            list_query += " AND s.id_kelas = %s"
            list_params.append(kelas_id)
        list_query += " GROUP BY s.id"
        
        sort_map = {
            'name_asc': 'ORDER BY s.nama_lengkap ASC',
            'name_desc': 'ORDER BY s.nama_lengkap DESC',
            'hadir_desc': 'ORDER BY hadir DESC, s.nama_lengkap ASC',
            'izin_desc': 'ORDER BY izin DESC, s.nama_lengkap ASC',
            'sakit_desc': 'ORDER BY sakit DESC, s.nama_lengkap ASC',
            'alpha_desc': 'ORDER BY alpha DESC, s.nama_lengkap ASC'
        }
        list_query += " " + sort_map.get(sort_by, sort_map['name_asc'])
        
        cur.execute(list_query, list_params)
        students = cur.fetchall()
        
        # Group by class and calculate stats per class
        grouped_data = {}
        for s in students:
            k_name = s['nama_kelas'] or "Tanpa Kelas"
            if k_name not in grouped_data:
                grouped_data[k_name] = {
                    'students': [],
                    'stats': {'hadir': 0, 'izin': 0, 'sakit': 0, 'alpha': 0, 'total': 0},
                    'percentages': {}
                }
            
            # Add student to class
            grouped_data[k_name]['students'].append(s)
            
            # Accumulate class stats
            grouped_data[k_name]['stats']['hadir'] += s['hadir'] or 0
            grouped_data[k_name]['stats']['izin'] += s['izin'] or 0
            grouped_data[k_name]['stats']['sakit'] += s['sakit'] or 0
            grouped_data[k_name]['stats']['alpha'] += s['alpha'] or 0
            grouped_data[k_name]['stats']['total'] += (s['hadir'] or 0) + (s['izin'] or 0) + (s['sakit'] or 0) + (s['alpha'] or 0)

        # Calculate percentages for each group
        for k_name, data in grouped_data.items():
            total = data['stats']['total']
            if total > 0:
                data['percentages'] = {
                    'hadir': round(data['stats']['hadir'] / total * 100, 1),
                    'izin': round(data['stats']['izin'] / total * 100, 1),
                    'sakit': round(data['stats']['sakit'] / total * 100, 1),
                    'alpha': round(data['stats']['alpha'] / total * 100, 1)
                }
            else:
                data['percentages'] = {'hadir': 0, 'izin': 0, 'sakit': 0, 'alpha': 0}

        # Sort classes alphabetically
        sorted_classes = sorted(grouped_data.keys())
        final_groups = [(k, grouped_data[k]) for k in sorted_classes]
        
        # Fetch daily attendance mapping
        att_query = """
            SELECT id_santri, DAY(tanggal) as day, status 
            FROM kehadiran 
            WHERE DATE_FORMAT(tanggal, '%%Y-%%m') = %s
        """
        cur.execute(att_query, [month_val])
        att_rows = cur.fetchall()
        
        # Map attendance by student_id then day
        attendance_map = {}
        for row in att_rows:
            sid = row['id_santri']
            if sid not in attendance_map:
                attendance_map[sid] = {}
            attendance_map[sid][row['day']] = row['status']
            
        cur.close()
        db.close()
        
        # Map for translation
        month_map = {
            'January': 'Januari', 'February': 'Februari', 'March': 'Maret',
            'April': 'April', 'May': 'Mei', 'June': 'Juni',
            'July': 'Juli', 'August': 'Agustus', 'September': 'September',
            'October': 'Oktober', 'November': 'November', 'December': 'Desember'
        }

        # Date for footer
        print_date = datetime.now().strftime('%d %B %Y')
        for eng, ind in month_map.items():
            if eng in print_date:
                print_date = print_date.replace(eng, ind)
                break

        return render_template('rekap_laporan.html', 
                               groups=final_groups, 
                               attendance_map=attendance_map, 
                               days_in_month=days_in_month,
                               current_month_label=current_month_label,
                               academic_title=academic_title,
                               print_date=print_date,
                               kelas_nama="Semua Kelas" if kelas_id == 'all' else students[0]['nama_kelas'] if students else "-")
    except Exception as e:
        if db: db.close()
        print(f"Rekap Error: {e}")
        return f"Terjadi kesalahan: {e}", 500


@app.route('/absensi')
@login_required
def absensi():
    db = get_db()
    kelas_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            from datetime import date
            today = date.today().strftime('%Y-%m-%d')
            
            # Fetch classes and count attendance records for today per class
            cur.execute("""
                SELECT k.*, 
                (SELECT COUNT(*) FROM kehadiran kh 
                 JOIN santri s ON kh.id_santri = s.id 
                 WHERE s.id_kelas = k.id AND kh.tanggal = %s) as rekap_count
                FROM kelas k 
                ORDER BY k.nama_kelas ASC
            """, (today,))
            kelas_list = cur.fetchall()
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching classes for attendance: {e}")
            
    return render_template('absensi.html', kelas_list=kelas_list)

@app.route('/absensi/<int:kelas_id>')
@login_required
def catat_kehadiran(kelas_id):
    db = get_db()
    kelas = None
    santri_list = []
    attendance_data = {}
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch Class Info
            cur.execute("SELECT * FROM kelas WHERE id = %s", (kelas_id,))
            kelas = cur.fetchone()
            
            if kelas:
                from datetime import date
                today = date.today().strftime('%Y-%m-%d')
                
                # Fetch Students in this class
                cur.execute("SELECT id, nis, nama_lengkap FROM santri WHERE id_kelas = %s ORDER BY nama_lengkap ASC", (kelas_id,))
                santri_list = cur.fetchall()
                
                # Fetch existing attendance for today
                cur.execute("""
                    SELECT id_santri, status 
                    FROM kehadiran 
                    WHERE tanggal = %s AND id_santri IN (SELECT id FROM santri WHERE id_kelas = %s)
                """, (today, kelas_id))
                records = cur.fetchall()
                attendance_data = {r['id_santri']: r['status'] for r in records}
            
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching students for attendance: {e}")
            
    if not kelas:
        flash("Kelas tidak ditemukan.", "danger")
        return redirect(url_for('absensi'))
        
    return render_template('catat_kehadiran.html', kelas=kelas, santri_list=santri_list, attendance_data=attendance_data)

@app.route('/simpan_absensi', methods=['POST'])
@login_required
def simpan_absensi():
    data = request.json
    if not data or 'attendance' not in data:
        return jsonify({'success': False, 'message': 'Data tidak valid'}), 400
        
    attendance = data['attendance'] # List of {student_id, status}
    db = get_db()
    if not db:
        return jsonify({'success': False, 'message': 'Gagal menyambung ke database'}), 500
        
    try:
        from datetime import date, datetime
        now = datetime.now()
        
        # Block Sunday (Sunday in Python's weekday() is 6)
        if now.weekday() == 6:
            return jsonify({'success': False, 'message': 'Hari Minggu tidak ada kegiatan absensi'}), 400
            
        today = now.strftime('%Y-%m-%d')
        now_time = now.strftime('%H:%M')
        
        cur = db.cursor()
        for item in attendance:
            student_id = item['student_id']
            status_map = {'H': 'Hadir', 'I': 'Izin', 'S': 'Sakit', 'A': 'Alpha'}
            full_status = status_map.get(item['status'])
            
            if not full_status: continue
            
            # Using INSERT ... ON DUPLICATE KEY UPDATE to allow same-day changes
            cur.execute("""
                INSERT INTO kehadiran (id_santri, status, tanggal, waktu)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE status = %s, waktu = %s
            """, (student_id, full_status, today, now_time, full_status, now_time))
            
        db.commit()
        
        # Record Log
        admin_name = session.get('admin_name', 'Seseorang')
        record_log(session.get('admin_id'), 'Kehadiran', f"<b>{admin_name}</b> telah melakukan rekap kehadiran")
        
        cur.close()
        db.close()
        return jsonify({'success': True, 'message': 'Presensi berhasil disimpan!'})
    except Exception as e:
        if db:
            try:
                db.close()
            except:
                pass
        print(f"Error saving attendance: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/santri')
@login_required
def santri():
    db = get_db()
    santri_list = []
    kelas_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch all students with class names
            cur.execute("""
                SELECT s.*, k.nama_kelas 
                FROM santri s 
                LEFT JOIN kelas k ON s.id_kelas = k.id 
                ORDER BY s.nama_lengkap ASC
            """)
            santri_list = cur.fetchall()
            
            # Fetch all classes for dropdown
            cur.execute("SELECT * FROM kelas ORDER BY nama_kelas ASC")
            kelas_list = cur.fetchall()
            
            # Fetch current admin data for header
            cur.execute("SELECT * FROM admins WHERE id = %s", (session.get('admin_id'),))
            admin_data = cur.fetchone()
            
            cur.close()
            db.close()
            return render_template('santri.html', santri_list=santri_list, kelas_list=kelas_list, admin=admin_data)
        except Exception as e:
            if db: db.close()
            flash(f'Error fetching data: {str(e)}', 'danger')
    return redirect(url_for('admin'))

@app.route('/tambah_santri', methods=['POST'])
@login_required
def tambah_santri():
    nis = request.form['nis']
    nama = request.form['nama_lengkap']
    gender = request.form['gender']
    id_kelas = request.form['id_kelas']
    if id_kelas == '': id_kelas = None
    
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            # Check NIS uniqueness
            cur.execute("SELECT id FROM santri WHERE nis = %s", (nis,))
            if cur.fetchone():
                flash(f'NIS {nis} sudah terdaftar!', 'danger')
                return redirect(url_for('santri'))
            
            cur.execute("""
                INSERT INTO santri (nis, nama_lengkap, gender, id_kelas) 
                VALUES (%s, %s, %s, %s)
            """, (nis, nama, gender, id_kelas))
            new_id = cur.lastrowid
            
            # Log activity
            cur.execute("""
                INSERT INTO log_aktivitas (admin_id, aksi, tabel_terkait, data_id) 
                VALUES (%s, %s, %s, %s)
            """, (session['admin_id'], f"Menambah santri: {nama}", "santri", new_id))
            
            db.commit()
            cur.close()
            db.close()
            flash(f'Santri {nama} berhasil ditambahkan!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menambah santri: {str(e)}', 'danger')
    return redirect(url_for('santri'))

@app.route('/edit_santri/<int:id>', methods=['POST'])
@login_required
def edit_santri(id):
    nis = request.form['nis']
    nama = request.form['nama_lengkap']
    gender = request.form['gender']
    id_kelas = request.form['id_kelas']
    if id_kelas == '': id_kelas = None
    
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            # Check NIS uniqueness (excluding current student)
            cur.execute("SELECT id FROM santri WHERE nis = %s AND id != %s", (nis, id))
            if cur.fetchone():
                flash(f'NIS {nis} sudah digunakan oleh santri lain!', 'danger')
                return redirect(url_for('santri'))
            
            cur.execute("""
                UPDATE santri 
                SET nis = %s, nama_lengkap = %s, gender = %s, id_kelas = %s 
                WHERE id = %s
            """, (nis, nama, gender, id_kelas, id))
            
            # Log activity
            cur.execute("""
                INSERT INTO log_aktivitas (admin_id, aksi, tabel_terkait, data_id) 
                VALUES (%s, %s, %s, %s)
            """, (session['admin_id'], f"Mengubah data santri: {nama}", "santri", id))
            
            db.commit()
            cur.close()
            db.close()
            flash(f'Data {nama} berhasil diperbarui!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal mengubah data: {str(e)}', 'danger')
    return redirect(url_for('santri'))

@app.route('/hapus_santri/<int:id>')
@login_required
def hapus_santri(id):
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            # Get name for logging
            cur.execute("SELECT nama_lengkap FROM santri WHERE id = %s", (id,))
            santri = cur.fetchone()
            if santri:
                nama = santri[0]
                cur.execute("DELETE FROM santri WHERE id = %s", (id,))
                
                # Log activity
                cur.execute("""
                    INSERT INTO log_aktivitas (admin_id, aksi, tabel_terkait, data_id) 
                    VALUES (%s, %s, %s, %s)
                """, (session['admin_id'], f"Menghapus santri: {nama}", "santri", id))
                
                db.commit()
                flash(f'Santri {nama} berhasil dihapus!', 'success')
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menghapus data: {str(e)}', 'danger')
    return redirect(url_for('santri'))

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
    db = get_db()
    kelas_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            cur.execute("SELECT * FROM kelas ORDER BY nama_kelas ASC")
            kelas_list = cur.fetchall()
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching classes for calendar: {e}")
            
    return render_template('calendar.html', kelas_list=kelas_list)

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
            
            # Record Log
            admin_name = session.get('admin_name', 'Seseorang')
            record_log(session.get('admin_id'), 'Berita', f"<b>{admin_name}</b> telah memposting <b>{kategori}</b>")
            
            cur.close()
            db.close()
            flash('Berita berhasil ditambahkan!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menambahkan berita: {str(e)}', 'danger')
    else:
        flash('Gagal menyambung ke database.', 'danger')
        
    return redirect(url_for('admin'))

@app.route('/manage_jadwal')
@login_required
def manage_jadwal():
    db = get_db()
    jadwal_list = []
    kelas_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch Schedules
            # Fetch Schedules
            cur.execute("""
                SELECT j.id, j.id_kelas, j.hari, j.mata_pelajaran, j.keterangan, 
                       TIME_FORMAT(j.waktu_mulai, '%H:%i') as waktu_mulai, 
                       TIME_FORMAT(j.waktu_selesai, '%H:%i') as waktu_selesai, 
                       k.nama_kelas 
                FROM jadwal j 
                JOIN kelas k ON j.id_kelas = k.id 
                ORDER BY FIELD(hari, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'), waktu_mulai ASC
            """)
            jadwal_list = cur.fetchall()
            
            # Fetch Classes for form
            cur.execute("SELECT * FROM kelas ORDER BY nama_kelas ASC")
            kelas_list = cur.fetchall()
            
            cur.close()
            db.close()
        except Exception as e:
            if db: db.close()
            print(f"Error fetching jadwal: {e}")
            
    return render_template('manage_jadwal.html', jadwal_list=jadwal_list, kelas_list=kelas_list)

@app.route('/api/jadwal')
def api_jadwal():
    db = get_db()
    jadwal_list = []
    if db:
        try:
            cur = db.cursor(MySQLdb.cursors.DictCursor)
            # Fetch Schedules with Class Names
            cur.execute("""
                SELECT j.id, j.id_kelas, j.hari, j.mata_pelajaran, j.keterangan, 
                       TIME_FORMAT(j.waktu_mulai, '%H:%i') as waktu_mulai, 
                       TIME_FORMAT(j.waktu_selesai, '%H:%i') as waktu_selesai, 
                       k.nama_kelas 
                FROM jadwal j 
                JOIN kelas k ON j.id_kelas = k.id 
                ORDER BY j.waktu_mulai ASC
            """)
            jadwal_list = cur.fetchall()
            
            # Convert time objects to string for JSON serialization
            # TIME_FORMAT returns strings, so we might not need extra conversion relative to datetime.timedelta
            # But let's keep the loop just in case or simpler:
            # Actually TIME_FORMAT returns a string, so the JSON serializer will handle it fine.
            # We can remove the manual conversion loop if it was only for timedelta/time objects.
            # However, let's just leave the loop or remove it? Use caution.
            # Previous loop:
            # for jadwal in jadwal_list:
            #     if 'waktu_mulai' in jadwal:
            #         jadwal['waktu_mulai'] = str(jadwal['waktu_mulai'])
            
            # Since we return strings now, let's check if we need to do anything.
            # If the DB returns strings, we are good.
            
            cur.close()
            db.close()
            return jsonify({'success': True, 'data': jadwal_list})
        except Exception as e:
            if db: db.close()
            print(f"Error fetching API jadwal: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
            
    return jsonify({'success': False, 'message': 'Database connection failed'}), 500

@app.route('/tambah_jadwal', methods=['POST'])
@login_required
def tambah_jadwal():
    id_kelas = request.form.get('id_kelas')
    hari = request.form.get('hari')
    mata_pelajaran = request.form.get('mata_pelajaran')
    waktu_mulai = request.form.get('waktu_mulai')
    waktu_selesai = request.form.get('waktu_selesai')
    keterangan = request.form.get('keterangan')
    
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            cur.execute("""
                INSERT INTO jadwal (id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan))
            db.commit()
            cur.close()
            db.close()
            flash('Jadwal berhasil ditambahkan!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menambah jadwal: {str(e)}', 'danger')
            
    return redirect(url_for('manage_jadwal'))

@app.route('/edit_jadwal/<int:id>', methods=['POST'])
@login_required
def edit_jadwal(id):
    id_kelas = request.form.get('id_kelas')
    hari = request.form.get('hari')
    mata_pelajaran = request.form.get('mata_pelajaran')
    waktu_mulai = request.form.get('waktu_mulai')
    waktu_selesai = request.form.get('waktu_selesai')
    keterangan = request.form.get('keterangan')
    
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            cur.execute("""
                UPDATE jadwal 
                SET id_kelas=%s, hari=%s, mata_pelajaran=%s, waktu_mulai=%s, waktu_selesai=%s, keterangan=%s 
                WHERE id=%s
            """, (id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan, id))
            db.commit()
            cur.close()
            db.close()
            flash('Jadwal berhasil diperbarui!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal memperbarui jadwal: {str(e)}', 'danger')
            
    return redirect(url_for('manage_jadwal'))

@app.route('/hapus_jadwal/<int:id>')
@login_required
def hapus_jadwal(id):
    db = get_db()
    if db:
        try:
            cur = db.cursor()
            cur.execute("DELETE FROM jadwal WHERE id = %s", (id,))
            db.commit()
            cur.close()
            db.close()
            flash('Jadwal berhasil dihapus!', 'success')
        except Exception as e:
            if db: db.close()
            flash(f'Gagal menghapus jadwal: {str(e)}', 'danger')
            
    return redirect(url_for('manage_jadwal'))

if __name__ == '__main__':
    app.run(debug=True)
