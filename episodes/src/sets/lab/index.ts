// Reusable 3D LAB SET. Compose: <LabStage cam> <LabRoom/> <GravityChambers/> <ControlPanel/> …mascots… </LabStage>
export { LabRoom, LabBench, Plant, Whiteboard, Matte } from "./LabRoom";
export { ControlPanel, type ScreenLine } from "./ControlPanel";
export { GravityChamber, GravityChambers, PLANET_CHAMBERS, type ChamberSpec, type MaxMarker } from "./GravityChambers";
export { LabStage, LabLights, LabPost } from "./LabStage";
export { BunsenBurner, FlaskShelf, GlowFlask, Poster, TestTubeRack, WallClock, type FlaskKind, type PosterKind } from "./LabProps";
export { CAMERAS, CHAMBER, CHAMBER_LABEL_Y, chamberX, closeUp, mixCam, project, toThreeCamera, MASCOT_COLORS, PASTEL, type CamState } from "./layout";
