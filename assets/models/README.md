# /assets/models

Drop authorized `.glb` / `.gltf` files here when available, e.g.:

```
sedan.glb
suv.glb
pickup.glb
sport.glb
sedan-interior.glb
engine.glb
wheel.glb
```

Then in `js/vehicle.js`, set the `model` field on the matching entry in
`VEHICLE_DATA` to the file path. The loader in `main.js` currently always
uses the procedural builder (`buildProceduralVehicle`) since no licensed
Toyota model ships with this prototype — wiring a `GLTFLoader` + `DRACOLoader`
branch that prefers `model` when present is the only change needed to switch
over, and the rest of the interaction system (hotspots, camera states, hood/
trunk/door animation) is written generically enough to keep working as long
as the loaded model's part names match: `hoodPivot`, `trunkPivot`,
`doors.{FL,FR,RL,RR}`, `wheels.{FL,FR,RL,RR}`, `headlights.{L,R}`.

For production, compress meshes with DRACO and textures with KTX2/Basis
before placing them here.
