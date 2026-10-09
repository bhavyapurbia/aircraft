# AIR POWER Operator User Guide — SIH26250

## 1. Role Capabilities Matrix

| Feature Module | Administrator | Planner | Viewer |
| :--- | :---: | :---: | :---: |
| View Operations Dashboard | Yes | Yes | Yes |
| Inspect Fleet Assets & Details | Yes | Yes | Yes |
| Register / Edit Fleet Aircraft | Yes | Yes | Read Only |
| Archive Fleet Aircraft | Yes | No | No |
| Schedule New Flight Sorties | Yes | Yes | Read Only |
| Run Automated Constraint Checks | Yes | Yes | Read Only |
| Execute Heuristic Optimiser | Yes | Yes | Read Only |
| Apply Optimised Plans to Database | Yes | Yes | No |
| Run What-If Disruption Simulations | Yes | Yes | Read Only |
| Export Analytics to CSV & Print | Yes | Yes | Yes |
| Inspect System Security Audit Logs | Yes | No | No |
| Modify Global Operating Settings | Yes | No | No |

---

## 2. Walkthrough: Resolving a Flight Schedule Conflict

1. Go to the **Sorties & Calendar** module (`/scheduling`).
2. Click **Schedule Sortie** to propose a new mission.
3. Click **"Run Constraint Check"** before saving. The backend engine inspects aircraft availability, maintenance windows, and pilot duty hours.
4. If a conflict occurs, the system flags the issue (e.g. `RESOURCE_OVERLAP` or `MAINTENANCE_COLLISION`).
5. Open the **Optimisation Engine** (`/optimisation`).
6. Set the planner priorities (e.g., Delay Mitigation = 40%, Cost Savings = 30%).
7. Click **Run Scheduling Optimisation Engine**. The solver identifies an uncommitted compatible aircraft or computes a non-overlapping departure slot.
8. Click **Apply Recommended Plan** to commit the resolved plan to the operational database.
