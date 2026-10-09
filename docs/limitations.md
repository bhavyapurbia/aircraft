# Prototype Scope, Known Limitations & Official SIH26250 Brief Verification

## 1. Prototype Context & Safety Boundary
This software prototype was created for Smart India Hackathon 2026 problem statement **SIH26250**: *"Air Power - Dynamic Air Operations & Resource Optimisation"* sponsored by the Ministry of Defence / Defence Services Staff College (DSSC).

> [!IMPORTANT]
> In accordance with safety policies and hackathon competition requirements, this prototype operates strictly on **synthetic civilian and dual-use logistics aviation data**. It does not access, store, or simulate classified military operational data, real-world weapons configurations, or live telemetry systems.

---

## 2. Checklist of Official SIH26250 Requirements to Verify Against Final Brief

| SIH26250 Requirement Area | Prototype Status | Items Needing Official Confirmation |
| :--- | :--- | :--- |
| **Multi-Source Data Fusion** | Implemented locally via unified MySQL relational schema | Confirm if DSSC provides specific legacy message formats (e.g. AFTN, OTH-T, ADEXP, JSON feeds). |
| **Weapon Loads / Stores Compatibility** | Abstracted to civilian cargo weight and pax payload | Confirm whether defence evaluation rubric requires fictional ordnance weight stations or strictly civilian transport payloads. |
| **Airspace & Weather Constraints** | Implemented as airfield-level disruption holds | Verify if official problem includes GIS geofencing / tactical shapefile airspace coordinates (e.g., GeoJSON / KML polygon corridors). |
| **Mathematical Optimisation Solver** | Implemented via deterministic explainable multi-objective heuristic solver | Confirm whether evaluators require integration with external Mixed-Integer Linear Programming (MILP) solvers (e.g. OR-Tools / GLPK) in the grand finale. |
| **Deployment Architecture** | Local Node.js + Vite + MySQL | Confirm if the hackathon evaluation environment provides isolated air-gapped Linux virtual machines or cloud hosting. |

---

## 3. Known Prototype Limitations
1. **Algorithm Boundary**: The current optimization solver is an explainable deterministic heuristic. While guaranteed to eliminate hard conflicts and provide repeatable results in millisecond latency, it does not guarantee a mathematically global optimum for NP-hard combinatorial formulations with thousands of concurrent sorties.
2. **Offline GIS / 3D Airspace**: The calendar currently provides monthly, weekly, and daily temporal scheduling views. 3D spatial flight vector rendering is reserved for future GIS module extension.
3. **Hardware Redundancy**: Designed as a single-node demonstration application with local database connection pooling; high-availability clustering and active-active replication are beyond hackathon prototype scope.
