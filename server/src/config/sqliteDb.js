const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../database/air_power_db.sqlite');

let dbInstance = null;

function getDatabase() {
  if (dbInstance) return dbInstance;

  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Register SQLite functions matching MySQL built-ins
  db.function('NOW', () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  });

  db.function('DATE', (val) => {
    if (!val) return null;
    return String(val).substring(0, 10);
  });

  db.function('CONCAT', (...args) => {
    return args.filter((a) => a !== null && a !== undefined).join('');
  });

  dbInstance = db;
  ensureSchemaAndSeed(db);
  return dbInstance;
}

function ensureSchemaAndSeed(db) {
  // Check if users table exists
  const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (check) {
    return; // Already initialized
  }

  console.log('[SQLite ENGINE] Initializing schema and seed data...');

  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT DEFAULT 'Civilian Air Operations Wing',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
    );`,

    `CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_code TEXT NOT NULL UNIQUE,
      resource_name TEXT NOT NULL,
      category TEXT NOT NULL,
      model TEXT NOT NULL,
      registration_no TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Available',
      capacity_pax INTEGER DEFAULT 0,
      payload_capacity_kg REAL DEFAULT 0.00,
      base_location TEXT DEFAULT 'Airfield Alpha (Western Hub)',
      hourly_cost REAL DEFAULT 1200.00,
      last_maintenance_date TEXT,
      next_scheduled_maintenance TEXT,
      total_flight_hours REAL DEFAULT 0.00,
      notes TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role_category TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      max_daily_duty_hours REAL DEFAULT 10.00,
      current_duty_hours REAL DEFAULT 0.00,
      base_location TEXT DEFAULT 'Airfield Alpha (Western Hub)',
      is_archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS qualifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      qualification_name TEXT NOT NULL,
      certification_body TEXT DEFAULT 'Civil Aviation Authority',
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT DEFAULT 'Valid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maintenance_code TEXT NOT NULL UNIQUE,
      resource_id INTEGER NOT NULL,
      maintenance_type TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      expected_completion DATETIME NOT NULL,
      actual_completion DATETIME,
      status TEXT DEFAULT 'Scheduled',
      assigned_technician TEXT NOT NULL,
      cost_estimate REAL DEFAULT 0.00,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT
    );`,

    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'Routine',
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      resource_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Scheduled',
      origin TEXT DEFAULT 'Airfield Alpha',
      destination TEXT DEFAULT 'Airfield Bravo',
      estimated_duration_hours REAL NOT NULL,
      estimated_cost REAL DEFAULT 0.00,
      required_qualification TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS staff_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      staff_id INTEGER NOT NULL,
      role_in_activity TEXT NOT NULL DEFAULT 'Assigned Crew',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      UNIQUE(activity_id, staff_id)
    );`,

    `CREATE TABLE IF NOT EXISTS schedule_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL,
      conflict_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      conflicting_activity_id INTEGER,
      conflicting_maintenance_id INTEGER,
      conflicting_staff_id INTEGER,
      description TEXT NOT NULL,
      suggested_action TEXT NOT NULL,
      is_resolved INTEGER DEFAULT 0,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (conflicting_activity_id) REFERENCES activities(id) ON DELETE SET NULL,
      FOREIGN KEY (conflicting_maintenance_id) REFERENCES maintenance_records(id) ON DELETE SET NULL,
      FOREIGN KEY (conflicting_staff_id) REFERENCES staff(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS optimisation_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_code TEXT NOT NULL UNIQUE,
      initiated_by INTEGER,
      objective_weights TEXT NOT NULL,
      total_activities_evaluated INTEGER DEFAULT 0,
      conflicts_avoided INTEGER DEFAULT 0,
      utilisation_improvement_pct REAL DEFAULT 0.00,
      cost_saved_estimate REAL DEFAULT 0.00,
      execution_time_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Completed',
      explanation_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS optimisation_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      optimisation_run_id INTEGER NOT NULL,
      activity_id INTEGER NOT NULL,
      original_start_time DATETIME NOT NULL,
      proposed_start_time DATETIME NOT NULL,
      original_resource_id INTEGER NOT NULL,
      proposed_resource_id INTEGER NOT NULL,
      original_cost REAL DEFAULT 0.00,
      proposed_cost REAL DEFAULT 0.00,
      change_reason TEXT NOT NULL,
      score_delta REAL DEFAULT 0.00,
      FOREIGN KEY (optimisation_run_id) REFERENCES optimisation_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS scenario_simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT NOT NULL,
      scenario_type TEXT NOT NULL,
      description TEXT NOT NULL,
      baseline_snapshot TEXT NOT NULL,
      simulation_params TEXT NOT NULL,
      impact_summary TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'Info',
      is_read INTEGER DEFAULT 0,
      related_entity_type TEXT,
      related_entity_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL DEFAULT 'System',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      outcome TEXT DEFAULT 'SUCCESS',
      ip_address TEXT DEFAULT '127.0.0.1',
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS application_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  db.transaction(() => {
    for (const sql of schemaStatements) {
      db.prepare(sql).run();
    }

    // Seed Roles
    const insertRole = db.prepare(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`);
    insertRole.run(1, 'Administrator', 'Full system configuration, resource allocation, user management, and audit inspection.');
    insertRole.run(2, 'Planner', 'Operational flight scheduling, conflict mitigation, what-if simulations, and optimisation.');
    insertRole.run(3, 'Viewer', 'Read-only situational awareness, analytics reports, and real-time dashboard inspection.');

    // Seed Users
    const insertUser = db.prepare(`INSERT INTO users (id, username, email, password_hash, role_id, full_name, department) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertUser.run(1, 'admin', 'admin@airpower.local', '$2a$10$86W71J7EcnclQ1QFYBzefeVvMdFw7PF9VXhhMhgOMS4F4neu8dzAK', 1, 'Commander Sarah Mitchell (Admin)', 'Operations Directorate Alpha');
    insertUser.run(2, 'planner', 'planner@airpower.local', '$2a$10$.pOTwgK8qmRSzfYlqKRvl.ZnXBJKl6QYb8GDEzKXr/3XUiyQxLkqm', 2, 'Flight Lead Vikram Rao (Planner)', 'Tactical Fleet Scheduling');
    insertUser.run(3, 'viewer', 'viewer@airpower.local', '$2a$10$K3mHfPKPkggLP5CKQCwHhuQ580C2tot8Gtwca57Hk3hOd/gmK5gRm', 3, 'Audit Officer Maya Chen (Viewer)', 'Aviation Quality & Compliance');

    // Seed Resources
    const insertResource = db.prepare(`INSERT INTO resources (id, resource_code, resource_name, category, model, registration_no, status, capacity_pax, payload_capacity_kg, base_location, hourly_cost, last_maintenance_date, next_scheduled_maintenance, total_flight_hours, notes, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertResource.run(1, 'RES-AP-01', 'Skylifter Heavy Cargo Alpha', 'Transport Cargo', 'Lockheed L-100-30 Hercules', 'VT-XCA-901', 'Available', 4, 19500.00, 'Airfield Alpha (Western Hub)', 2800.00, '2026-09-15', '2026-10-25', 1420.50, 'Certified for heavy tactical supply drops and remote airstrips.', 0);
    insertResource.run(2, 'RES-AP-02', 'AeroGuardian Multi-Role', 'Multi-Role Utility', 'Airbus C-295 Tactical', 'VT-XMR-402', 'Scheduled', 70, 9200.00, 'Airfield Alpha (Western Hub)', 1950.00, '2026-09-20', '2026-11-05', 980.00, 'High short-takeoff capability for mountainous disaster relief.', 0);
    insertResource.run(3, 'RES-AP-03', 'FalconEye Maritime Recon', 'Surveillance & Recon', 'Dornier 228-201 MPA', 'VT-XSR-303', 'Available', 18, 2100.00, 'Coastal Air Station Beta', 1450.00, '2026-08-30', '2026-10-18', 2140.75, 'Equipped with forward-looking infrared and civilian search radar.', 0);
    insertResource.run(4, 'RES-AP-04', 'Lifeline Aero-Ambulance 1', 'Air Ambulance', 'Pilatus PC-12/47E Spectre', 'VT-XAA-104', 'Available', 6, 1200.00, 'Airfield Alpha (Western Hub)', 1100.00, '2026-09-10', '2026-10-28', 840.20, 'Pressurised ICU medical cabin with dual oxygen supply.', 0);
    insertResource.run(5, 'RES-AP-05', 'RotorRescue Heavy SAR', 'Search & Rescue', 'Mil Mi-171A2 Heavy Rotorcraft', 'VT-XSR-505', 'Under Maintenance', 24, 4000.00, 'Northern Outpost Gamma', 2200.00, '2026-10-02', '2026-10-14', 1650.00, 'Undergoing scheduled A-check turbine inspection.', 0);
    insertResource.run(6, 'RES-AP-06', 'Highlander Mountain Feeder', 'Transport Cargo', 'Antonov An-32B Tactical Feeder', 'VT-XTF-606', 'Scheduled', 42, 6700.00, 'Northern Outpost Gamma', 1750.00, '2026-09-01', '2026-10-22', 3100.10, 'High-altitude airfield specialized logistics workhorse.', 0);
    insertResource.run(7, 'RES-AP-07', 'SkyTrainer Advanced Falcon', 'Training Flight', 'Beechcraft King Air 350ER', 'VT-XTR-707', 'Available', 8, 1500.00, 'Airfield Alpha (Western Hub)', 950.00, '2026-09-28', '2026-11-15', 1230.40, 'Instrument flight simulator avionics certification platform.', 0);
    insertResource.run(8, 'RES-AP-08', 'Vanguard Patrol Drone Escort', 'Surveillance & Recon', 'Diamond DA42 Guardian Twin', 'VT-XSR-808', 'Unavailable', 4, 600.00, 'Coastal Air Station Beta', 850.00, '2026-08-15', '2026-10-10', 890.00, 'Temporarily grounded awaiting replacement pitot sensor assembly.', 0);

    // Seed Staff
    const insertStaff = db.prepare(`INSERT INTO staff (id, staff_code, full_name, email, phone, role_category, status, max_daily_duty_hours, current_duty_hours, base_location, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertStaff.run(1, 'STF-001', 'Capt. Aarav Sharma', 'aarav.sharma@airpower.local', '+91 98110 44001', 'Captain / Chief Pilot', 'Active', 10.00, 3.50, 'Airfield Alpha (Western Hub)', 0);
    insertStaff.run(2, 'STF-002', 'Capt. Priya Nair', 'priya.nair@airpower.local', '+91 98110 44002', 'Captain / Chief Pilot', 'Active', 10.00, 2.00, 'Northern Outpost Gamma', 0);
    insertStaff.run(3, 'STF-003', 'Lt. Rohan Verma', 'rohan.verma@airpower.local', '+91 98110 44003', 'First Officer', 'Active', 10.00, 4.00, 'Airfield Alpha (Western Hub)', 0);
    insertStaff.run(4, 'STF-004', 'Dr. Ananya Deshmukh', 'ananya.deshmukh@airpower.local', '+91 98110 44004', 'Medical Evac Specialist', 'Active', 12.00, 1.50, 'Airfield Alpha (Western Hub)', 0);
    insertStaff.run(5, 'STF-005', 'Eng. Rajesh Kulkarni', 'rajesh.kulkarni@airpower.local', '+91 98110 44005', 'Flight Engineer', 'Active', 8.00, 5.00, 'Coastal Air Station Beta', 0);
    insertStaff.run(6, 'STF-006', 'Sqn. Officer Kabir Khan', 'kabir.khan@airpower.local', '+91 98110 44006', 'Operations Controller', 'On Duty', 12.00, 7.50, 'Airfield Alpha (Western Hub)', 0);

    // Seed Qualifications
    const insertQual = db.prepare(`INSERT INTO qualifications (id, staff_id, qualification_name, certification_body, issue_date, expiry_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertQual.run(1, 1, 'Heavy Transport Type Rating (L-100 / C-130)', 'DGCA India', '2025-01-15', '2027-01-15', 'Valid');
    insertQual.run(2, 1, 'Instrument Rating Multi-Engine Commercial', 'DGCA India', '2025-06-10', '2026-10-15', 'Expiring Soon');
    insertQual.run(3, 2, 'Tactical Mountain Low-Altitude Clearance', 'Aviation Safety Wing', '2025-03-20', '2027-03-20', 'Valid');
    insertQual.run(4, 2, 'Heavy Turboprop Captain Certification', 'DGCA India', '2024-05-10', '2026-05-10', 'Expired');
    insertQual.run(5, 3, 'First Officer C-295 & Twin Turboprop', 'Air Transport Training Command', '2025-08-01', '2027-08-01', 'Valid');
    insertQual.run(6, 4, 'Critical Care Aeromedical Transport Specialist', 'National Medical Air Wing', '2025-02-12', '2027-02-12', 'Valid');
    insertQual.run(7, 5, 'Turbine Engine Maintenance & Diagnostic Master', 'Aeronautical Society Board', '2024-11-01', '2026-11-01', 'Valid');
    insertQual.run(8, 6, 'Air Traffic Tactical Scheduling Supervisor', 'National Airspace Directorate', '2025-04-10', '2027-04-10', 'Valid');

    // Seed Maintenance Records
    const insertMaint = db.prepare(`INSERT INTO maintenance_records (id, maintenance_code, resource_id, maintenance_type, start_time, expected_completion, actual_completion, status, assigned_technician, cost_estimate, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertMaint.run(1, 'MNT-2026-001', 5, 'A-Check Routine', '2026-10-08 08:00:00', '2026-10-11 18:00:00', null, 'In Progress', 'Tech Lead Suresh Mehta', 8500.00, 'Turbine stator blade boroscope inspection and gearbox fluid renewal.');
    insertMaint.run(2, 'MNT-2026-002', 8, 'Unscheduled Repair', '2026-10-09 10:00:00', '2026-10-12 16:00:00', null, 'In Progress', 'Avionics Eng. Sunil Joshi', 4200.00, 'Pitot sensor static line pressure differential test failure investigation.');
    insertMaint.run(3, 'MNT-2026-003', 3, 'B-Check Intermediate', '2026-10-18 09:00:00', '2026-10-20 18:00:00', null, 'Scheduled', 'Senior Aircraftman D. Sen', 12000.00, 'Radar dome moisture seal replacement and hydraulic accumulator servicing.');
    insertMaint.run(4, 'MNT-2026-004', 1, 'Avionics Overhaul', '2026-10-25 08:00:00', '2026-10-28 17:00:00', null, 'Scheduled', 'Fleet Avionics Team Bravo', 18500.00, 'TCAS II firmware modernisation and satellite communications transponder calibration.');

    // Seed Activities
    const insertAct = db.prepare(`INSERT INTO activities (id, activity_code, title, category, priority, start_time, end_time, resource_id, status, origin, destination, estimated_duration_hours, estimated_cost, required_qualification, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertAct.run(1, 'ACT-HIST-01', 'Himalayan Forward Logistics Airbridge', 'Logistics Cargo Supply', 'High', '2026-10-05 06:00:00', '2026-10-05 11:30:00', 1, 'Completed', 'Airfield Alpha', 'Northern Outpost Gamma', 5.50, 15400.00, 'Heavy Transport Type Rating (L-100 / C-130)', 'Delivered 16.5 metric tonnes of emergency cold-weather supplies.', 2);
    insertAct.run(2, 'ACT-HIST-02', 'Eastern Littoral Reconnaissance Patrol', 'Routine Recon Patrol', 'Routine', '2026-10-06 09:00:00', '2026-10-06 14:00:00', 3, 'Completed', 'Coastal Air Station Beta', 'Coastal Air Station Beta', 5.00, 7250.00, 'Instrument Rating Multi-Engine Commercial', 'Routine coastal maritime surveillance and vessel traffic mapping.', 2);
    insertAct.run(3, 'ACT-HIST-03', 'Emergency Island Medevac Sortie', 'Medical Emergency Airlift', 'Critical Urgent', '2026-10-07 14:00:00', '2026-10-07 17:30:00', 4, 'Completed', 'Airfield Alpha', 'Island Airfield Delta', 3.50, 3850.00, 'Critical Care Aeromedical Transport Specialist', 'Urgent medical transfer of civilian patient under ventilator support.', 2);
    insertAct.run(4, 'ACT-SCHED-04', 'Western Desert Tactical Supply Run', 'Logistics Cargo Supply', 'Routine', '2026-10-10 07:00:00', '2026-10-10 12:00:00', 2, 'Scheduled', 'Airfield Alpha', 'Desert Staging Base Epsilon', 5.00, 9750.00, 'First Officer C-295 & Twin Turboprop', 'Transporting replacement auxiliary generator parts and crew provisions.', 2);
    insertAct.run(5, 'ACT-SCHED-05', 'High-Altitude Valley Airdrop Drill', 'Personnel Transport', 'High', '2026-10-10 13:00:00', '2026-10-10 17:30:00', 6, 'Scheduled', 'Northern Outpost Gamma', 'Valley Drop Zone 4', 4.50, 7875.00, 'Tactical Mountain Low-Altitude Clearance', 'Simulated emergency food and thermal blanket supply drop for disaster relief drill.', 2);
    insertAct.run(6, 'ACT-SCHED-06', 'Avionics Calibration & Crew Certification', 'Pilot Re-qualification Flight', 'Routine', '2026-10-11 10:00:00', '2026-10-11 14:00:00', 7, 'Scheduled', 'Airfield Alpha', 'Airfield Alpha', 4.00, 3800.00, 'Instrument Rating Multi-Engine Commercial', 'Annual instrument rating checks for secondary pilot batch.', 2);
    insertAct.run(7, 'ACT-SCHED-07', 'Inter-Sector Heavy Transport Shuttle', 'Logistics Cargo Supply', 'Routine', '2026-10-12 08:00:00', '2026-10-12 14:30:00', 1, 'Scheduled', 'Airfield Alpha', 'Coastal Air Station Beta', 6.50, 18200.00, 'Heavy Transport Type Rating (L-100 / C-130)', 'Scheduled transfer of heavy turbine components between regional bases.', 2);
    insertAct.run(8, 'ACT-SCHED-08', 'Offshore Marine Disaster Watch', 'Coastal Search & Rescue', 'High', '2026-10-13 08:30:00', '2026-10-13 13:30:00', 3, 'Scheduled', 'Coastal Air Station Beta', 'Maritime Zone Bravo-7', 5.00, 7250.00, 'Instrument Rating Multi-Engine Commercial', 'Coordinated search patrol following tropical cyclonic sea state warning.', 2);
    insertAct.run(9, 'ACT-SCHED-09', 'Remote Border Clinic Medical Relief', 'Medical Emergency Airlift', 'Critical Urgent', '2026-10-14 06:00:00', '2026-10-14 10:30:00', 4, 'Scheduled', 'Airfield Alpha', 'Northern Outpost Gamma', 4.50, 4950.00, 'Critical Care Aeromedical Transport Specialist', 'Urgent blood plasma and neonatal incubator delivery to regional health center.', 2);
    insertAct.run(10, 'ACT-CONFLICT-10', 'Express VIP Liaison Ferry (Resource Overlap)', 'Personnel Transport', 'High', '2026-10-10 10:00:00', '2026-10-10 15:00:00', 2, 'Scheduled', 'Airfield Alpha', 'Capital City Metro', 5.00, 9750.00, 'First Officer C-295 & Twin Turboprop', 'CONSTRUCTED DEMO CONFLICT: Overlaps Resource 2 (AeroGuardian) with ACT-SCHED-04 (07:00-12:00 vs 10:00-15:00).', 2);
    insertAct.run(11, 'ACT-CONFLICT-11', 'High-Altitude Rescue Sortie (Maintenance Collision)', 'Coastal Search & Rescue', 'Critical Urgent', '2026-10-10 09:00:00', '2026-10-10 14:00:00', 5, 'Scheduled', 'Northern Outpost Gamma', 'Sector Peak 9', 5.00, 11000.00, 'Tactical Mountain Low-Altitude Clearance', 'CONSTRUCTED DEMO CONFLICT: Resource 5 (RotorRescue) is undergoing A-Check maintenance MNT-2026-001 until Oct 11 18:00.', 2);
    insertAct.run(12, 'ACT-CONFLICT-12', 'Supplementary Tactical Lift (Crew Double-Booked)', 'Logistics Cargo Supply', 'Routine', '2026-10-12 09:00:00', '2026-10-12 13:00:00', 6, 'Scheduled', 'Airfield Alpha', 'Desert Staging Base Epsilon', 4.00, 7000.00, 'Heavy Turboprop Captain Certification', 'CONSTRUCTED DEMO CONFLICT: Crew member Capt. Aarav Sharma assigned to both ACT-SCHED-07 and ACT-CONFLICT-12 simultaneously.', 2);

    // Seed Staff Assignments
    const insertStaffAct = db.prepare(`INSERT INTO staff_activities (activity_id, staff_id, role_in_activity) VALUES (?, ?, ?)`);
    insertStaffAct.run(1, 1, 'Command Pilot in Charge');
    insertStaffAct.run(1, 5, 'Chief Flight Engineer');
    insertStaffAct.run(2, 2, 'Command Pilot in Charge');
    insertStaffAct.run(3, 4, 'Flight Medical Doctor');
    insertStaffAct.run(4, 3, 'Command Pilot in Charge');
    insertStaffAct.run(5, 2, 'Command Pilot in Charge');
    insertStaffAct.run(6, 1, 'Instructor Captain');
    insertStaffAct.run(7, 1, 'Command Pilot in Charge');
    insertStaffAct.run(8, 2, 'Command Pilot in Charge');
    insertStaffAct.run(9, 4, 'Flight Medical Doctor');
    insertStaffAct.run(10, 3, 'Assigned First Officer');
    insertStaffAct.run(11, 2, 'Search Mission Commander');
    insertStaffAct.run(12, 1, 'Command Pilot in Charge');

    // Seed Conflicts
    const insertConflict = db.prepare(`INSERT INTO schedule_conflicts (id, activity_id, conflict_type, severity, conflicting_activity_id, conflicting_maintenance_id, conflicting_staff_id, description, suggested_action, is_resolved, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertConflict.run(1, 10, 'RESOURCE_OVERLAP', 'Critical Error', 4, null, null, 'Resource RES-AP-02 (AeroGuardian) is already committed to activity ACT-SCHED-04 between 07:00 and 12:00 on 2026-10-10.', 'Delay start time to after 12:30 or assign alternate transport asset RES-AP-01 / RES-AP-07.', 0, '2026-10-09 10:15:00');
    insertConflict.run(2, 11, 'MAINTENANCE_COLLISION', 'Constraint Breach', null, 1, null, 'Resource RES-AP-05 (RotorRescue) is grounded under active maintenance MNT-2026-001 (A-Check Routine) until 2026-10-11 18:00.', 'Reschedule rescue standby to follow maintenance release time or dispatch available asset RES-AP-04.', 0, '2026-10-09 10:20:00');
    insertConflict.run(3, 12, 'STAFF_DOUBLE_BOOKED', 'Critical Error', 7, null, 1, 'Capt. Aarav Sharma (STF-001) is already rostered for flight ACT-SCHED-07 (08:00 - 14:30) on 2026-10-12.', 'Reassign duty to available pilot Capt. Priya Nair (STF-002) or adjust departure to non-overlapping slot.', 0, '2026-10-09 10:25:00');

    // Seed Optimisation Run & Results
    const insertOptRun = db.prepare(`INSERT INTO optimisation_runs (id, run_code, initiated_by, objective_weights, total_activities_evaluated, conflicts_avoided, utilisation_improvement_pct, cost_saved_estimate, execution_time_ms, status, explanation_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertOptRun.run(1, 'OPT-RUN-2026-001', 2, '{"reduceDelays":0.35,"improveUtilisation":0.25,"reduceOperatingCosts":0.20,"balanceWorkload":0.10,"reduceIdleTime":0.10}', 12, 3, 14.80, 4250.00, 128, 'Feasible Solution Found', 'Resolved 3 resource collisions and crew double-booking by redistributing ACT-CONFLICT-10 to RES-AP-07 and reallocating pilot duty to Capt. Priya Nair.', '2026-10-09 11:00:00');

    const insertOptRes = db.prepare(`INSERT INTO optimisation_results (id, optimisation_run_id, activity_id, original_start_time, proposed_start_time, original_resource_id, proposed_resource_id, original_cost, proposed_cost, change_reason, score_delta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertOptRes.run(1, 1, 10, '2026-10-10 10:00:00', '2026-10-10 13:00:00', 2, 7, 9750.00, 4750.00, 'Reassigned to available King Air 350ER and shifted departure by 3h to eliminate overlap.', 28.50);
    insertOptRes.run(2, 1, 11, '2026-10-10 09:00:00', '2026-10-12 09:00:00', 5, 5, 11000.00, 11000.00, 'Deferred post-maintenance completion window on 2026-10-11 18:00.', 19.20);
    insertOptRes.run(3, 1, 12, '2026-10-12 09:00:00', '2026-10-12 15:00:00', 6, 6, 7000.00, 7000.00, 'Shifted departure to 15:00 to provide mandatory 30m turnaround post ACT-SCHED-07.', 15.80);

    // Seed Scenario Simulation
    const insertScenario = db.prepare(`INSERT INTO scenario_simulations (id, scenario_name, scenario_type, description, baseline_snapshot, simulation_params, impact_summary, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertScenario.run(1, 'Scenario Sim: Severe Fog Grounding at Airfield Alpha', 'Weather Grounding', 'Simulating closure of Western Hub runway for 8 hours on 2026-10-10 due to low visibility conditions.', '{"totalActivities":12,"baseUtilisation":68.5}', '{"delayedAirfield":"Airfield Alpha","delayDurationHours":8,"affectedCategory":"Logistics"}', '{"impactedFlights":3,"cascadingDelayHours":14.5,"estimatedCostIncrease":5800,"newConflicts":2}', 2, '2026-10-09 11:30:00');

    // Seed Notifications
    const insertNotif = db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, severity, is_read, related_entity_type, related_entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertNotif.run(1, 1, 'CONFLICT_ALERT', 'Critical Resource Collision Detected', 'Activity ACT-CONFLICT-10 collides with ACT-SCHED-04 on AeroGuardian (VT-XMR-402).', 'Urgent', 0, 'activity', 10, '2026-10-09 10:15:00');
    insertNotif.run(2, 2, 'CONFLICT_ALERT', 'Maintenance Safety Boundary Breach', 'Flight ACT-CONFLICT-11 scheduled during active turbine inspection of RES-AP-05.', 'Urgent', 0, 'activity', 11, '2026-10-09 10:20:00');
    insertNotif.run(3, 2, 'QUALIFICATION_EXPIRING', 'Pilot Certification Expiring Soon', 'Capt. Aarav Sharma instrument rating expires on 2026-10-15 (< 7 days remaining).', 'Warning', 0, 'staff', 1, '2026-10-09 09:00:00');
    insertNotif.run(4, 1, 'MAINTENANCE_DUE', 'Upcoming Scheduled B-Check', 'Dornier 228 (RES-AP-03) routine inspection starts on 2026-10-18.', 'Info', 1, 'maintenance', 3, '2026-10-08 16:00:00');

    // Seed Audit Logs
    const insertAudit = db.prepare(`INSERT INTO audit_logs (id, user_id, username, action, entity_type, entity_id, outcome, ip_address, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertAudit.run(1, 1, 'admin', 'USER_LOGIN', 'AUTH', '1', 'SUCCESS', '127.0.0.1', 'Administrator Sarah Mitchell logged in successfully.', '2026-10-09 08:30:15');
    insertAudit.run(2, 2, 'planner', 'SCHEDULE_VALIDATE', 'SCHEDULE', 'ACT-CONFLICT-10', 'FAILURE', '127.0.0.1', 'Validation detected overlap on resource RES-AP-02.', '2026-10-09 10:15:22');
    insertAudit.run(3, 2, 'planner', 'OPTIMISATION_RUN', 'OPTIMISATION', 'OPT-RUN-2026-001', 'SUCCESS', '127.0.0.1', 'Executed heuristic optimisation; 3 conflicts resolved, 14.8% gain.', '2026-10-09 11:00:05');
    insertAudit.run(4, 1, 'admin', 'RESOURCE_UPDATE', 'RESOURCE', 'RES-AP-05', 'SUCCESS', '127.0.0.1', 'Updated maintenance status for RotorRescue Heavy SAR.', '2026-10-09 11:15:40');

    // Seed Settings
    const insertSetting = db.prepare(`INSERT INTO application_settings (setting_key, setting_value, category, description) VALUES (?, ?, ?, ?)`);
    insertSetting.run('system_name', 'AIR POWER - Dynamic Air Operations & Resource Optimisation', 'General', 'Application display title for SIH26250 prototype');
    insertSetting.run('turnaround_buffer_minutes', '45', 'Scheduling', 'Mandatory aircraft ground turnaround buffer between consecutive missions');
    insertSetting.run('max_pilot_daily_hours', '10.0', 'Compliance', 'Civilian aviation regulatory maximum duty hours per 24-hour cycle');
    insertSetting.run('conflict_auto_check', 'true', 'Engine', 'Automatically run backend conflict detection on schedule creation or update');
    insertSetting.run('optimisation_algorithm', 'heuristic_scored_v1', 'Optimisation', 'Current active explainable scheduling optimisation algorithm');
  })();

  console.log('[SQLite ENGINE] Schema & seed initialization completed successfully.');
}

// Convert MySQL SQL to SQLite syntax
function translateSql(sql) {
  let s = sql;
  // Convert GROUP_CONCAT(expr SEPARATOR ', ') -> GROUP_CONCAT(expr, ', ')
  s = s.replace(/GROUP_CONCAT\s*\(([\s\S]*?)\s+SEPARATOR\s+('[^']*')\s*\)/gi, 'GROUP_CONCAT($1, $2)');
  // Convert ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value) -> ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
  s = s.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE\s+(\w+)\s*=\s*VALUES\(\1\)/gi, 'ON CONFLICT DO UPDATE SET $1 = excluded.$1');
  return s;
}

async function sqliteQuery(sql, params = []) {
  const db = getDatabase();
  const cleanSql = translateSql(sql).trim();

  // Normalize parameters: ensure boolean/dates are safe
  const cleanParams = (Array.isArray(params) ? params : [params]).map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace('T', ' ');
    return p;
  });

  const isSelect = /^(SELECT|PRAGMA|WITH)\b/i.test(cleanSql);

  try {
    const stmt = db.prepare(cleanSql);
    if (isSelect) {
      return stmt.all(...cleanParams);
    } else {
      const info = stmt.run(...cleanParams);
      return {
        insertId: Number(info.lastInsertRowid),
        affectedRows: info.changes
      };
    }
  } catch (err) {
    console.error('[SQLite Query Error]:', err.message);
    console.error('SQL was:', cleanSql);
    console.error('Params were:', cleanParams);
    throw err;
  }
}

async function sqliteTransaction(callback) {
  const db = getDatabase();
  const tx = db.transaction(async () => {
    return await callback({
      query: sqliteQuery,
      execute: sqliteQuery
    });
  });
  return tx();
}

const sqlitePool = {
  getConnection: async () => ({
    release: () => {},
    execute: async (sql, params) => {
      const rows = await sqliteQuery(sql, params);
      return [rows, []];
    },
    query: async (sql, params) => {
      const rows = await sqliteQuery(sql, params);
      return [rows, []];
    }
  }),
  execute: async (sql, params) => {
    const rows = await sqliteQuery(sql, params);
    return [rows, []];
  },
  query: async (sql, params) => {
    const rows = await sqliteQuery(sql, params);
    return [rows, []];
  },
  end: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};

module.exports = {
  getDatabase,
  sqliteQuery,
  sqliteTransaction,
  sqlitePool,
  DB_PATH
};
