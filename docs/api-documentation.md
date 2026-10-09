# AIR POWER REST API Documentation — SIH26250

Base URL: `http://localhost:5000/api`

All protected endpoints require HTTP Header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
- **Access**: Public (Rate-limited to 30 requests / 15m)
- **Request Body**:
  ```json
  {
    "username": "planner",
    "password": "Planner@12345"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "username": "planner",
      "email": "planner@airpower.local",
      "full_name": "Flight Lead Vikram Rao (Planner)",
      "role_id": 2,
      "role_name": "Planner",
      "department": "Tactical Fleet Scheduling"
    }
  }
  ```

### `GET /api/auth/me`
- **Access**: Authenticated

---

## 2. Dashboard Endpoints

### `GET /api/dashboard/summary`
- **Response** (200 OK):
  Returns KPI counts: total registered resources, available resources, resources under maintenance, active conflicts, upcoming activities, and fleet utilisation percentage.

### `GET /api/dashboard/analytics`
- **Response** (200 OK):
  Returns time-series flight hour data, category readiness bars, and maintenance distribution.

---

## 3. Resource Endpoints

### `GET /api/resources`
- **Query Params**: `page`, `limit`, `search`, `status`, `category`, `sortBy`, `order`
- **Response**: Paginated list of fleet aircraft assets.

### `POST /api/resources`
- **Access**: Administrator, Planner
- **Request Body**:
  ```json
  {
    "resource_name": "AeroGuardian III",
    "category": "Multi-Role Utility",
    "model": "Airbus C-295 Tactical",
    "registration_no": "VT-XMR-999",
    "status": "Available",
    "capacity_pax": 70,
    "payload_capacity_kg": 9200,
    "hourly_cost": 1950
  }
  ```

### `GET /api/resources/export/csv`
- **Response**: Downloads `air-power-resources.csv`.

---

## 4. Scheduling & Validation Endpoints

### `GET /api/activities`
- **Query Params**: `status`, `resource_id`, `category`, `start_date`, `end_date`

### `POST /api/activities/validate`
- **Description**: Dry-run operational conflict validation engine.
- **Request Body**: Proposed activity payload.
- **Response**:
  ```json
  {
    "success": true,
    "is_valid": false,
    "conflicts_count": 1,
    "conflicts": [
      {
        "conflict_type": "RESOURCE_OVERLAP",
        "severity": "Critical Error",
        "description": "Resource VT-XMR-402 is already committed to activity ACT-SCHED-04 from 07:00 to 12:00.",
        "suggested_action": "Reschedule departure to after 12:45."
      }
    ]
  }
  ```

### `POST /api/activities`
- **Access**: Administrator, Planner
- **Response** (409 Conflict if hard constraint violated without force, 201 Created on success).

---

## 5. Optimisation Endpoints

### `POST /api/optimisation/run`
- **Request Body**:
  ```json
  {
    "weights": {
      "reduceDelays": 0.35,
      "improveUtilisation": 0.25,
      "reduceOperatingCosts": 0.20,
      "balanceWorkload": 0.10,
      "reduceIdleTime": 0.10
    }
  }
  ```
- **Response**:
  Returns resolved conflicts, score delta, and before-and-after schedule proposals.

### `POST /api/optimisation/runs/:id/apply`
- **Description**: Commits proposed alternative allocations into active database tables.
