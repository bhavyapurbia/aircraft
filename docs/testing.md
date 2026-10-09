# AIR POWER Testing Guide & Test Results — SIH26250

## 1. Automated Test Suite Summary
The backend automated test suite verifies authentication, RBAC authorization, conflict detection rules, the heuristic optimisation engine, and scenario simulation isolation.

To run the automated tests:
```powershell
cd server
npm test
```

### Automated Test Execution Results
All test suites passed 100% cleanly:

| Test Suite | Test Case | Status | Execution Time |
| :--- | :--- | :---: | :---: |
| `conflict.test.js` | Should reject end time before start time | **PASSED** | 5.5 ms |
| `conflict.test.js` | Should reject missing mandatory parameters | **PASSED** | 0.4 ms |
| `conflict.test.js` | Should detect overlapping activities on same aircraft | **PASSED** | 106.1 ms |
| `conflict.test.js` | Should detect collision with scheduled maintenance window | **PASSED** | 6.6 ms |
| `conflict.test.js` | Should flag staff double-booking | **PASSED** | 15.0 ms |
| `conflict.test.js` | Should flag expired qualifications | **PASSED** | 35.5 ms |
| `api.test.js` | Health endpoint returns 200 and healthy status | **PASSED** | 82.0 ms |
| `api.test.js` | Rejects login with invalid credentials | **PASSED** | 212.5 ms |
| `api.test.js` | Allows valid login for administrator | **PASSED** | 163.9 ms |
| `api.test.js` | Restricts audit log access to Administrator role only | **PASSED** | 151.9 ms |
| `optimisation.test.js` | Optimisation engine generates feasible alternatives | **PASSED** | 702.9 ms |
| `optimisation.test.js` | Scenario simulation maintains baseline data isolation | **PASSED** | 17.6 ms |

---

## 2. End-to-End Manual Testing Checklist

Use this checklist during demonstration or evaluation:

- [ ] **Step 1: Sign-in Demonstration**
  - Navigate to `http://localhost:5173/login`.
  - Click the **Planner** quick-fill button (`planner` / `Planner@12345`).
  - Verify redirection to `/` and that Planner role badge is displayed.

- [ ] **Step 2: Dashboard Real-time Verification**
  - Verify that the Dashboard KPI cards display actual database counts (e.g. 8 fleet assets, active conflicts, upcoming sorties).
  - Verify that the flight hours timeline chart and category bars render data dynamically.

- [ ] **Step 3: Conflict Centre Inspection**
  - Navigate to `/conflicts`.
  - Verify that the 3 deliberately constructed demonstration conflicts are displayed:
    1. `ACT-CONFLICT-10`: Aircraft overlap on `RES-AP-02`.
    2. `ACT-CONFLICT-11`: Collision with maintenance window on `RES-AP-05`.
    3. `ACT-CONFLICT-12`: Double-booking of `Capt. Aarav Sharma`.

- [ ] **Step 4: Heuristic Optimisation Engine Execution**
  - Navigate to `/optimisation`.
  - Adjust objective weight sliders (e.g. Delay vs Cost).
  - Click **"Run Scheduling Optimisation Engine"**.
  - Inspect the before-and-after comparison table showing aircraft reallocations and departure slot shifts.
  - Click **"Apply Recommended Plan to Live Schedule"** to commit the resolution.

- [ ] **Step 5: What-If Scenario Stress Testing**
  - Navigate to `/scenarios`.
  - Select "Aircraft Grounded (Technical Hold)" on an active aircraft.
  - Click **"Execute What-If Simulation"**.
  - Verify that virtual conflicts and estimated cascading delay hours are calculated while live schedules remain untouched.

- [ ] **Step 6: Role Permission Verification**
  - Sign out and log in as **Viewer** (`viewer` / `Viewer@12345`).
  - Attempt to access `http://localhost:5173/audit-logs`.
  - Verify that the application redirects to `/access-denied`.
