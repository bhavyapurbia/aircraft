# AIR POWER Heuristic Optimisation Engine Method — SIH26250

## 1. Problem Formulation
In high-tempo air operations, scheduling is subjected to both **Hard Operational Constraints** (mandatory non-negotiable boundaries) and **Soft Objective Functions** (multi-criteria performance optimisation).

### Hard Constraints (Zero-Tolerance)
1. **No Aircraft Double-Booking**: An aircraft can only be assigned to one sortie at any given time plus a mandatory ground turnaround buffer ($T_{\text{buffer}} = 45\text{ min}$).
2. **Maintenance Lockout**: No flight may overlap with an active or scheduled maintenance window ($[T_{\text{maint\_start}}, T_{\text{maint\_end}}]$).
3. **Crew Qualification Compliance**: Flight crew must possess valid, unexpired type ratings matching the mission's requirements.
4. **Crew Duty Regulations**: A pilot's cumulative 24-hour duty time must not exceed $H_{\text{max}} = 10\text{ hours}$.
5. **Airframe Availability**: Grounded or archived resources cannot be dispatched.

---

## 2. Multi-Objective Scoring Formulation

The composite suitability score for any candidate alternative schedule $k$ is calculated as:

$$\text{Score}(k) = \sum_{i=1}^{5} w_i \cdot S_i(k)$$

Where:
- $w_1$ = Weight for Delay Mitigation (`reduceDelays`)
- $w_2$ = Weight for Fleet Utilisation Balance (`improveUtilisation`)
- $w_3$ = Weight for Hourly Operating Cost Minimisation (`reduceOperatingCosts`)
- $w_4$ = Weight for Crew Duty Workload Balance (`balanceWorkload`)
- $w_5$ = Weight for Idle Ground Time Reduction (`reduceIdleTime`)

Subject to:
$$\sum_{i=1}^{5} w_i = 1.0, \quad w_i \ge 0$$

### Sub-Score Formulations
1. **Delay Score** ($S_1$):
   $$S_1 = \max\left(0, 100 - 10 \cdot \Delta T_{\text{delay}}\right)$$
   Where $\Delta T_{\text{delay}}$ is departure slip in hours. Zero delay yields 100 points.

2. **Cost Score** ($S_3$):
   $$S_3 = 80 + \min\left(20, \frac{\text{Cost}_{\text{original}} - \text{Cost}_{\text{proposed}}}{500}\right)$$
   Fosters assignment to fuel-efficient / cost-effective aircraft models without sacrificing payload.

3. **Utilisation Score** ($S_2$):
   Favours aircraft with lower historical airframe hours to prevent uneven wear across the fleet.

---

## 3. Algorithmic Search Strategy
1. **Conflict Filtering**: Identify all sorties violating hard constraints in the current roster.
2. **Alternative Aircraft Candidate Search**:
   - Filter available fleet assets sharing required operational category capabilities.
   - Test time-slot viability against existing bookings.
3. **Time-Shift Deferral**:
   - If no alternate aircraft is available immediately, compute the earliest conflict release window.
   - Add the regulatory 45-minute turnaround buffer and evaluate the delayed slot.
4. **Composite Ranking**:
   - Sort candidates by composite score descending.
   - Record the winning candidate along with a transparent human-readable explanation.
