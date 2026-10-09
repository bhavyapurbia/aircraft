-- AIR POWER - Dynamic Air Operations & Resource Optimisation
-- Database Schema for SIH26250
-- Target Engine: MariaDB / MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `air_power_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `air_power_db`;

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) DEFAULT 'Civilian Air Operations Wing',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. RESOURCES TABLE
CREATE TABLE IF NOT EXISTS `resources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `resource_code` VARCHAR(50) NOT NULL UNIQUE,
  `resource_name` VARCHAR(100) NOT NULL,
  `category` ENUM('Transport Cargo', 'Air Ambulance', 'Surveillance & Recon', 'Multi-Role Utility', 'Executive Transport', 'Training Flight', 'Search & Rescue') NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `registration_no` VARCHAR(50) NOT NULL UNIQUE,
  `status` ENUM('Available', 'Scheduled', 'Under Maintenance', 'Unavailable', 'Archived') NOT NULL DEFAULT 'Available',
  `capacity_pax` INT DEFAULT 0,
  `payload_capacity_kg` DECIMAL(10,2) DEFAULT 0.00,
  `base_location` VARCHAR(100) DEFAULT 'Airfield Alpha (Western Hub)',
  `hourly_cost` DECIMAL(10,2) DEFAULT 1200.00,
  `last_maintenance_date` DATE NULL,
  `next_scheduled_maintenance` DATE NULL,
  `total_flight_hours` DECIMAL(10,2) DEFAULT 0.00,
  `notes` TEXT NULL,
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resource_status (`status`),
  INDEX idx_resource_category (`category`),
  INDEX idx_resource_archived (`is_archived`)
) ENGINE=InnoDB;

-- 4. STAFF TABLE
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `role_category` ENUM('Captain / Chief Pilot', 'First Officer', 'Avionics Specialist', 'Flight Engineer', 'Operations Controller', 'Medical Evac Specialist') NOT NULL,
  `status` ENUM('Active', 'On Duty', 'Rest Period', 'Leave', 'Archived') DEFAULT 'Active',
  `max_daily_duty_hours` DECIMAL(4,2) DEFAULT 10.00,
  `current_duty_hours` DECIMAL(4,2) DEFAULT 0.00,
  `base_location` VARCHAR(100) DEFAULT 'Airfield Alpha (Western Hub)',
  `is_archived` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_status (`status`),
  INDEX idx_staff_category (`role_category`)
) ENGINE=InnoDB;

-- 5. QUALIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `qualifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` INT NOT NULL,
  `qualification_name` VARCHAR(120) NOT NULL,
  `certification_body` VARCHAR(120) NOT NULL DEFAULT 'Civil Aviation Authority',
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `status` ENUM('Valid', 'Expiring Soon', 'Expired') DEFAULT 'Valid',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE,
  INDEX idx_qual_expiry (`expiry_date`),
  INDEX idx_qual_status (`status`)
) ENGINE=InnoDB;

-- 6. MAINTENANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS `maintenance_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `maintenance_code` VARCHAR(50) NOT NULL UNIQUE,
  `resource_id` INT NOT NULL,
  `maintenance_type` ENUM('A-Check Routine', 'B-Check Intermediate', 'C-Check Heavy Structural', 'Avionics Overhaul', 'Engine Diagnostic & Servicing', 'Unscheduled Repair') NOT NULL,
  `start_time` DATETIME NOT NULL,
  `expected_completion` DATETIME NOT NULL,
  `actual_completion` DATETIME NULL,
  `status` ENUM('Scheduled', 'In Progress', 'Completed', 'Overdue', 'Cancelled') DEFAULT 'Scheduled',
  `assigned_technician` VARCHAR(120) NOT NULL,
  `cost_estimate` DECIMAL(10,2) DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE RESTRICT,
  INDEX idx_maint_resource (`resource_id`),
  INDEX idx_maint_times (`start_time`, `expected_completion`),
  INDEX idx_maint_status (`status`)
) ENGINE=InnoDB;

-- 7. ACTIVITIES / SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(150) NOT NULL,
  `category` ENUM('Logistics Cargo Supply', 'Personnel Transport', 'Coastal Search & Rescue', 'Routine Recon Patrol', 'Medical Emergency Airlift', 'Pilot Re-qualification Flight', 'Rapid Disaster Response') NOT NULL,
  `priority` ENUM('Routine', 'High', 'Critical Urgent') DEFAULT 'Routine',
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `resource_id` INT NOT NULL,
  `status` ENUM('Draft', 'Scheduled', 'In Progress', 'Completed', 'Delayed', 'Cancelled') DEFAULT 'Scheduled',
  `origin` VARCHAR(100) DEFAULT 'Airfield Alpha',
  `destination` VARCHAR(100) DEFAULT 'Airfield Bravo',
  `estimated_duration_hours` DECIMAL(5,2) NOT NULL,
  `estimated_cost` DECIMAL(10,2) DEFAULT 0.00,
  `required_qualification` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX idx_act_times (`start_time`, `end_time`),
  INDEX idx_act_resource (`resource_id`),
  INDEX idx_act_status (`status`)
) ENGINE=InnoDB;

-- 8. STAFF ACTIVITIES (Many-to-Many Assignment)
CREATE TABLE IF NOT EXISTS `staff_activities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` INT NOT NULL,
  `staff_id` INT NOT NULL,
  `role_in_activity` VARCHAR(100) NOT NULL DEFAULT 'Assigned Crew',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE,
  UNIQUE KEY unique_act_staff (`activity_id`, `staff_id`)
) ENGINE=InnoDB;

-- 9. SCHEDULE CONFLICTS TABLE
CREATE TABLE IF NOT EXISTS `schedule_conflicts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `activity_id` INT NOT NULL,
  `conflict_type` ENUM(
    'RESOURCE_OVERLAP',
    'MAINTENANCE_COLLISION',
    'UNAVAILABLE_RESOURCE',
    'STAFF_DOUBLE_BOOKED',
    'STAFF_HOURS_VIOLATION',
    'EXPIRED_QUALIFICATION',
    'INVALID_DURATION',
    'RESOURCE_CAPACITY_EXCEEDED'
  ) NOT NULL,
  `severity` ENUM('Warning', 'Critical Error', 'Constraint Breach') NOT NULL,
  `conflicting_activity_id` INT NULL,
  `conflicting_maintenance_id` INT NULL,
  `conflicting_staff_id` INT NULL,
  `description` TEXT NOT NULL,
  `suggested_action` TEXT NOT NULL,
  `is_resolved` TINYINT(1) DEFAULT 0,
  `detected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`conflicting_activity_id`) REFERENCES `activities`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`conflicting_maintenance_id`) REFERENCES `maintenance_records`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`conflicting_staff_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL,
  INDEX idx_conflict_resolved (`is_resolved`),
  INDEX idx_conflict_type (`conflict_type`)
) ENGINE=InnoDB;

-- 10. OPTIMISATION RUNS TABLE
CREATE TABLE IF NOT EXISTS `optimisation_runs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `run_code` VARCHAR(50) NOT NULL UNIQUE,
  `initiated_by` INT NULL,
  `objective_weights` LONGTEXT NOT NULL,
  `total_activities_evaluated` INT DEFAULT 0,
  `conflicts_avoided` INT DEFAULT 0,
  `utilisation_improvement_pct` DECIMAL(5,2) DEFAULT 0.00,
  `cost_saved_estimate` DECIMAL(10,2) DEFAULT 0.00,
  `execution_time_ms` INT DEFAULT 0,
  `status` ENUM('Completed', 'Feasible Solution Found', 'Infeasible - Hard Constraints') DEFAULT 'Completed',
  `explanation_summary` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`initiated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. OPTIMISATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS `optimisation_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `optimisation_run_id` INT NOT NULL,
  `activity_id` INT NOT NULL,
  `original_start_time` DATETIME NOT NULL,
  `proposed_start_time` DATETIME NOT NULL,
  `original_resource_id` INT NOT NULL,
  `proposed_resource_id` INT NOT NULL,
  `original_cost` DECIMAL(10,2) DEFAULT 0.00,
  `proposed_cost` DECIMAL(10,2) DEFAULT 0.00,
  `change_reason` VARCHAR(255) NOT NULL,
  `score_delta` DECIMAL(6,2) DEFAULT 0.00,
  FOREIGN KEY (`optimisation_run_id`) REFERENCES `optimisation_runs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. SCENARIO SIMULATIONS TABLE
CREATE TABLE IF NOT EXISTS `scenario_simulations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `scenario_name` VARCHAR(150) NOT NULL,
  `scenario_type` ENUM('Resource Grounded', 'Maintenance Extension', 'Staff Sick / Unavailable', 'Urgent Priority Injection', 'Weather Grounding') NOT NULL,
  `description` TEXT NOT NULL,
  `baseline_snapshot` LONGTEXT NOT NULL,
  `simulation_params` LONGTEXT NOT NULL,
  `impact_summary` LONGTEXT NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `type` ENUM('CONFLICT_ALERT', 'MAINTENANCE_DUE', 'QUALIFICATION_EXPIRING', 'SCHEDULE_CHANGE', 'OPTIMISATION_SUCCESS') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `severity` ENUM('Info', 'Warning', 'Urgent') DEFAULT 'Info',
  `is_read` TINYINT(1) DEFAULT 0,
  `related_entity_type` VARCHAR(50) NULL,
  `related_entity_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_notif_unread (`user_id`, `is_read`)
) ENGINE=InnoDB;

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `username` VARCHAR(60) NOT NULL DEFAULT 'System',
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` VARCHAR(60) NULL,
  `outcome` ENUM('SUCCESS', 'FAILURE', 'DENIED') DEFAULT 'SUCCESS',
  `ip_address` VARCHAR(50) DEFAULT '127.0.0.1',
  `details` TEXT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_time (`timestamp`),
  INDEX idx_audit_action (`action`)
) ENGINE=InnoDB;

-- 15. APPLICATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS `application_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `category` VARCHAR(50) DEFAULT 'General',
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
