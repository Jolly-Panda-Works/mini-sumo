import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BackSide,
  BoxGeometry,
  Color,
  CapsuleGeometry,
  CircleGeometry,
  ConeGeometry,
  OctahedronGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type Mesh,
} from "three";
import { DEFAULT_APPEARANCE, FACES, HAIR_COLORS, HAIR_STYLES, MASKS, OUTFITS, type Appearance } from "@mini-sumo/shared";

/** Shared geometry: created once, reused by every sumo (no per-player allocations). */
const GEO = {
  body: new IcosahedronGeometry(0.72, 1),
  belt: new CylinderGeometry(0.75, 0.7, 0.3, 12),
  beltStripe: new CylinderGeometry(0.765, 0.745, 0.05, 12),
  flap: new BoxGeometry(0.32, 0.38, 0.08),
  apron: new BoxGeometry(0.56, 0.62, 0.06),
  emblem: new CircleGeometry(0.14, 16),
  rope: new TorusGeometry(0.78, 0.075, 6, 20),
  shide: new BoxGeometry(0.1, 0.2, 0.02),
  head: new IcosahedronGeometry(0.52, 1),
  // Hats
  helmet: new SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  neckGuard: new CylinderGeometry(0.62, 0.78, 0.3, 12, 1, true),
  // Over a mask: a shallower dome with no neck guard, so the animal's face shows
  helmetCap: new SphereGeometry(0.6, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4),
  horn: new BoxGeometry(0.07, 0.42, 0.04),
  crest: new CylinderGeometry(0.09, 0.09, 0.03, 10),
  kasa: new ConeGeometry(0.95, 0.42, 14),
  kasaBand: new CylinderGeometry(0.47, 0.5, 0.08, 12),
  crownBand: new CylinderGeometry(0.4, 0.42, 0.2, 12, 1, true),
  crownPoint: new ConeGeometry(0.08, 0.2, 4),
  gem: new OctahedronGeometry(0.05, 0),
  // Masks (a curved plate in front of the face)
  mask: new SphereGeometry(0.56, 14, 10, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.22, Math.PI * 0.52),
  maskEye: new BoxGeometry(0.13, 0.04, 0.03),
  maskEar: new ConeGeometry(0.1, 0.26, 4),
  maskHorn: new ConeGeometry(0.06, 0.24, 6),
  fang: new ConeGeometry(0.03, 0.08, 4),
  nose: new CylinderGeometry(0.035, 0.07, 0.42, 8),
  stripe: new BoxGeometry(0.03, 0.12, 0.02),
  knot: new IcosahedronGeometry(0.15, 0),
  knotFan: new BoxGeometry(0.1, 0.08, 0.3),
  spike: new ConeGeometry(0.11, 0.3, 5),
  bowl: new SphereGeometry(0.56, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
  mohawk: new BoxGeometry(0.09, 0.24, 0.13),
  eye: new SphereGeometry(0.065, 8, 6),
  eyeHappy: new TorusGeometry(0.06, 0.018, 4, 10, Math.PI),
  eyeClosed: new BoxGeometry(0.13, 0.025, 0.03),
  lens: new BoxGeometry(0.2, 0.12, 0.04),
  bridge: new BoxGeometry(0.12, 0.03, 0.03),
  brow: new BoxGeometry(0.17, 0.04, 0.04),
  browThick: new BoxGeometry(0.2, 0.075, 0.05),
  cheek: new CircleGeometry(0.085, 10),
  mouth: new BoxGeometry(0.14, 0.035, 0.03),
  smile: new TorusGeometry(0.075, 0.02, 4, 10, Math.PI),
  mouthO: new SphereGeometry(0.04, 8, 6),
  mustache: new CapsuleGeometry(0.035, 0.12, 2, 6),
  arm: new CapsuleGeometry(0.15, 0.3, 3, 8),
  ponytail: new CapsuleGeometry(0.11, 0.38, 3, 8),
  afro: new IcosahedronGeometry(0.6, 1),
  bun: new IcosahedronGeometry(0.17, 1),
  headband: new TorusGeometry(0.535, 0.055, 6, 28),
  bandTail: new BoxGeometry(0.08, 0.26, 0.03),
  bigEye: new SphereGeometry(0.09, 10, 8),
  star: new OctahedronGeometry(0.095, 0),
  dot: new SphereGeometry(0.05, 6, 4),
  sagari: new CylinderGeometry(0.025, 0.025, 0.3, 5),
  cape: new BoxGeometry(1.05, 0.95, 0.04),
  armband: new TorusGeometry(0.16, 0.045, 6, 16),
  // Animal masks
  hood: new IcosahedronGeometry(0.6, 2),
  muzzle: new IcosahedronGeometry(0.26, 1),
  animalNose: new IcosahedronGeometry(0.075, 0),
  patch: new IcosahedronGeometry(0.15, 1),
  roundEar: new CylinderGeometry(0.19, 0.19, 0.08, 8),
  innerEar: new CylinderGeometry(0.11, 0.11, 0.09, 8),
  pointEar: new ConeGeometry(0.17, 0.34, 4),
  bigEar: new IcosahedronGeometry(0.4, 1),
  mane: new ConeGeometry(0.2, 0.36, 5),
  furStripe: new BoxGeometry(0.05, 0.2, 0.03),
  furSpot: new IcosahedronGeometry(0.05, 0),
  trunk: new CylinderGeometry(0.1, 0.12, 0.2, 7),
  tusk: new ConeGeometry(0.05, 0.28, 6),
  animalHorn: new ConeGeometry(0.12, 0.42, 6),
  leg: new CylinderGeometry(0.2, 0.23, 0.34, 8),
  ring: new RingGeometry(0.86, 1.02, 32),
};

const SKIN = new MeshStandardMaterial({ color: "#FFD3B0", roughness: 0.8, flatShading: true });
const INK = new MeshStandardMaterial({ color: "#2B2340", roughness: 0.6, flatShading: true });
const WHITE = new MeshStandardMaterial({ color: "#FBF8F2", roughness: 0.7, flatShading: true });
const GOLD = new MeshStandardMaterial({ color: "#F2C14E", roughness: 0.4, metalness: 0.3, flatShading: true });
const GOLD_INSIDE = new MeshStandardMaterial({ color: "#F2C14E", roughness: 0.4, metalness: 0.3, flatShading: true, side: BackSide });
const CHEEK = new MeshBasicMaterial({ color: "#FF8FA3", transparent: true, opacity: 0.75 });
const BAND = new MeshStandardMaterial({ color: "#E2443A", roughness: 0.6, flatShading: true });
const SAKURA = new MeshStandardMaterial({ color: "#FF9EC4", roughness: 0.6, flatShading: true });
const DRAGON = new MeshStandardMaterial({ color: "#1C1A24", roughness: 0.55, flatShading: true });
const IRON = new MeshStandardMaterial({ color: "#3B3F4E", roughness: 0.45, metalness: 0.45, flatShading: true });
const STRAW = new MeshStandardMaterial({ color: "#D8B266", roughness: 0.95, flatShading: true });
const MASK_WHITE = new MeshStandardMaterial({ color: "#F7F3EA", roughness: 0.5, flatShading: true });
const MASK_RED = new MeshStandardMaterial({ color: "#D23A2E", roughness: 0.5, flatShading: true });
const GEM = new MeshStandardMaterial({ color: "#E2443A", roughness: 0.2, emissive: "#5A0E0A", flatShading: true });
const SPARKLE = new MeshStandardMaterial({ color: "#FFD23F", roughness: 0.3, emissive: "#8A6400", flatShading: true });

const materialCache = new Map<string, MeshStandardMaterial>();
const ringMaterials = new Map<string, MeshBasicMaterial>();

function colorMaterial(color: string, roughness = 0.55): MeshStandardMaterial {
  const key = `${color}:${roughness}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new MeshStandardMaterial({ color, roughness, flatShading: true });
    materialCache.set(key, mat);
  }
  return mat;
}

function ringMaterial(color: string): MeshBasicMaterial {
  let mat = ringMaterials.get(color);
  if (!mat) {
    mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    ringMaterials.set(color, mat);
  }
  return mat;
}

export interface SumoParts {
  dashStrength: RefObject<number>;
  root: RefObject<Group | null>;
  torso: RefObject<Group | null>;
  head: RefObject<Group | null>;
  eyes: RefObject<Group | null>;
  armL: RefObject<Group | null>;
  armR: RefObject<Group | null>;
  legL: RefObject<Mesh | null>;
  legR: RefObject<Mesh | null>;
  ring: RefObject<Mesh | null>;
}

export function useSumoParts(): SumoParts {
  return {
    dashStrength: useRef(0),
    root: useRef<Group>(null),
    torso: useRef<Group>(null),
    head: useRef<Group>(null),
    eyes: useRef<Group>(null),
    armL: useRef<Group>(null),
    armR: useRef<Group>(null),
    legL: useRef<Mesh>(null),
    legR: useRef<Mesh>(null),
    ring: useRef<Mesh>(null),
  };
}

// ---------------------------------------------------------------- hair

function Hair({ style, color, masked = false }: { style: string; color: string; masked?: boolean }) {
  const mat = colorMaterial(color, 0.6);
  switch (style) {
    case "bald":
      return null;
    case "spiky":
      return (
        <group>
          {[
            [0, 0.5, 0, 0, 0],
            [0.2, 0.44, 0.08, -0.5, 0.35],
            [-0.2, 0.44, 0.08, 0.5, 0.35],
            [0.16, 0.42, -0.2, -0.45, -0.45],
            [-0.16, 0.42, -0.2, 0.45, -0.45],
            [0, 0.38, -0.3, 0, -0.8],
          ].map(([x, y, z, rz, rx], i) => (
            <mesh key={i} geometry={GEO.spike} material={mat} position={[x!, y!, z!]} rotation={[rx!, 0, rz!]} castShadow />
          ))}
        </group>
      );
    case "bowl":
      return <mesh geometry={GEO.bowl} material={mat} position={[0, 0.04, -0.03]} rotation-x={-0.18} castShadow />;
    case "mohawk":
      return (
        <group>
          {[0.32, 0.12, -0.1, -0.32, -0.52].map((angle, i) => (
            <mesh
              key={i}
              geometry={GEO.mohawk}
              material={mat}
              position={[0, Math.cos(angle) * 0.52, Math.sin(angle) * 0.52]}
              rotation-x={angle}
              castShadow
            />
          ))}
        </group>
      );
    case "ponytail":
      return (
        <group>
          <mesh geometry={GEO.knot} material={mat} position={[0, 0.36, -0.45]} />
          <mesh geometry={GEO.ponytail} material={mat} position={[0, 0.1, -0.6]} rotation-x={0.35} castShadow />
        </group>
      );
    case "afro":
      return <mesh geometry={GEO.afro} material={mat} position={[0, 0.28, -0.2]} scale={[1.12, 1, 1]} castShadow />;
    case "buns":
      return (
        <group>
          <mesh geometry={GEO.bun} material={mat} position={[-0.3, 0.44, -0.06]} castShadow />
          <mesh geometry={GEO.bun} material={mat} position={[0.3, 0.44, -0.06]} castShadow />
        </group>
      );
    case "kasa":
      // Straw hat: a wide shallow cone over the head
      return (
        <group position-y={0.42}>
          <mesh geometry={GEO.kasa} material={STRAW} castShadow />
          <mesh geometry={GEO.kasaBand} material={BAND} position-y={-0.12} />
        </group>
      );
    case "kabuto":
      // Samurai helmet: iron dome, flared neck guard, gold horns and crest
      return (
        <group>
          <mesh geometry={masked ? GEO.helmetCap : GEO.helmet} material={IRON} position-y={0.02} castShadow />
          {!masked && <mesh geometry={GEO.neckGuard} material={IRON} position={[0, 0.02, -0.04]} castShadow />}
          <mesh geometry={GEO.horn} material={GOLD} position={[-0.16, 0.6, 0.38]} rotation={[0.25, 0, 0.45]} />
          <mesh geometry={GEO.horn} material={GOLD} position={[0.16, 0.6, 0.38]} rotation={[0.25, 0, -0.45]} />
          <mesh geometry={GEO.crest} material={GOLD} position={[0, 0.42, 0.45]} rotation-x={Math.PI / 2 - 0.5} />
        </group>
      );
    case "crown":
      // Gold crown with points and gems
      return (
        <group position-y={0.48}>
          <mesh geometry={GEO.crownBand} material={GOLD} castShadow />
          <mesh geometry={GEO.crownBand} material={GOLD_INSIDE} />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i}>
                <mesh geometry={GEO.crownPoint} material={GOLD} position={[Math.sin(a) * 0.4, 0.18, Math.cos(a) * 0.4]} />
                <mesh geometry={GEO.gem} material={GEM} position={[Math.sin(a + 0.52) * 0.42, 0, Math.cos(a + 0.52) * 0.42]} />
              </group>
            );
          })}
        </group>
      );
    case "samurai":
      return (
        <group>
          <mesh geometry={GEO.knot} material={mat} position={[0, 0.5, -0.1]} />
          <mesh geometry={GEO.knotFan} material={mat} position={[0, 0.6, -0.02]} />
          <mesh geometry={GEO.headband} material={BAND} position-y={0.16} rotation-x={Math.PI / 2} />
          <mesh geometry={GEO.bandTail} material={BAND} position={[0.08, 0.02, -0.55]} rotation-z={0.3} />
          <mesh geometry={GEO.bandTail} material={BAND} position={[-0.06, 0.0, -0.55]} rotation-z={-0.25} />
        </group>
      );
    default: // topknot (chonmage)
      return (
        <group>
          <mesh geometry={GEO.knot} material={mat} position={[0, 0.5, -0.1]} />
          <mesh geometry={GEO.knotFan} material={mat} position={[0, 0.6, -0.02]} />
        </group>
      );
  }
}

// ---------------------------------------------------------------- face

function Face({ style, eyesRef }: { style: string; eyesRef: RefObject<Group | null> }) {
  const cheeks = (
    <>
      <mesh geometry={GEO.cheek} material={CHEEK} position={[-0.29, -0.08, 0.43]} rotation-y={-0.55} />
      <mesh geometry={GEO.cheek} material={CHEEK} position={[0.29, -0.08, 0.43]} rotation-y={0.55} />
    </>
  );

  switch (style) {
    case "laughing":
      // Eyes shut tight with joy, a big open laugh
      return (
        <>
          <group ref={eyesRef} position={[0, 0.06, 0.47]}>
            <mesh geometry={GEO.eyeClosed} material={INK} position={[-0.17, 0, 0.01]} rotation-z={0.25} />
            <mesh geometry={GEO.eyeClosed} material={INK} position={[0.17, 0, 0.01]} rotation-z={-0.25} />
          </group>
          <mesh geometry={GEO.mouth} material={INK} position={[0, -0.15, 0.49]} scale={[1.7, 1.5, 1]} />
          <mesh geometry={GEO.cheek} material={CHEEK} position={[-0.3, -0.06, 0.4]} />
          <mesh geometry={GEO.cheek} material={CHEEK} position={[0.3, -0.06, 0.4]} />
        </>
      );
    case "smug":
      // Half-closed eyes, one raised brow, a lopsided smile
      return (
        <>
          <group ref={eyesRef} position={[0, 0.05, 0.47]}>
            <mesh geometry={GEO.eye} material={INK} position-x={-0.17} scale={[1, 0.55, 1]} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.17} scale={[1, 0.55, 1]} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.17, 0.48]} rotation-z={0.05} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.22, 0.46]} rotation-z={-0.3} />
          <mesh geometry={GEO.smile} material={INK} position={[0.06, -0.13, 0.49]} rotation-z={0.25} scale={[0.8, 1, 1]} />
        </>
      );
    case "kitsune":
      // White fox mask: pointed ears, narrow eyes, red markings
      return (
        <>
          <mesh geometry={GEO.mask} material={MASK_WHITE} position-z={0.02} />
          <group ref={eyesRef} position={[0, 0.07, 0.53]}>
            <mesh geometry={GEO.maskEye} material={INK} position-x={-0.16} rotation-z={-0.3} />
            <mesh geometry={GEO.maskEye} material={INK} position-x={0.16} rotation-z={0.3} />
          </group>
          <mesh geometry={GEO.maskEar} material={MASK_WHITE} position={[-0.27, 0.48, 0.25]} rotation-z={0.35} />
          <mesh geometry={GEO.maskEar} material={MASK_WHITE} position={[0.27, 0.48, 0.25]} rotation-z={-0.35} />
          <mesh geometry={GEO.stripe} material={MASK_RED} position={[-0.17, 0.19, 0.53]} rotation-z={0.5} />
          <mesh geometry={GEO.stripe} material={MASK_RED} position={[0.17, 0.19, 0.53]} rotation-z={-0.5} />
          <mesh geometry={GEO.stripe} material={MASK_RED} position={[0, 0.27, 0.53]} />
          <mesh geometry={GEO.smile} material={MASK_RED} position={[0, -0.14, 0.55]} rotation-z={Math.PI} />
        </>
      );
    case "oni":
      // Red demon mask: horns, angry brows, fangs
      return (
        <>
          <mesh geometry={GEO.mask} material={MASK_RED} position-z={0.02} />
          <group ref={eyesRef} position={[0, 0.07, 0.54]}>
            <mesh geometry={GEO.bigEye} material={GOLD} position-x={-0.16} scale={[1, 0.7, 0.5]} />
            <mesh geometry={GEO.bigEye} material={GOLD} position-x={0.16} scale={[1, 0.7, 0.5]} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.16, 0.2, 0.54]} rotation-z={-0.45} />
          <mesh geometry={GEO.brow} material={INK} position={[0.16, 0.2, 0.54]} rotation-z={0.45} />
          <mesh geometry={GEO.maskHorn} material={MASK_WHITE} position={[-0.22, 0.5, 0.22]} rotation-z={0.3} />
          <mesh geometry={GEO.maskHorn} material={MASK_WHITE} position={[0.22, 0.5, 0.22]} rotation-z={-0.3} />
          <mesh geometry={GEO.mouth} material={INK} position={[0, -0.15, 0.55]} scale={[1.6, 1.4, 1]} />
          <mesh geometry={GEO.fang} material={MASK_WHITE} position={[-0.07, -0.13, 0.57]} rotation-x={Math.PI} />
          <mesh geometry={GEO.fang} material={MASK_WHITE} position={[0.07, -0.13, 0.57]} rotation-x={Math.PI} />
        </>
      );
    case "tengu":
      // Red tengu mask: the long nose, bushy white brows
      return (
        <>
          <mesh geometry={GEO.mask} material={MASK_RED} position-z={0.02} />
          <group ref={eyesRef} position={[0, 0.1, 0.54]}>
            <mesh geometry={GEO.eye} material={INK} position-x={-0.16} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.16} />
          </group>
          <mesh geometry={GEO.brow} material={MASK_WHITE} position={[-0.16, 0.23, 0.54]} rotation-z={-0.25} scale={[1.3, 1.6, 1]} />
          <mesh geometry={GEO.brow} material={MASK_WHITE} position={[0.16, 0.23, 0.54]} rotation-z={0.25} scale={[1.3, 1.6, 1]} />
          <mesh geometry={GEO.nose} material={MASK_RED} position={[0, -0.02, 0.72]} rotation-x={Math.PI / 2 - 0.15} castShadow />
          <mesh geometry={GEO.mouth} material={INK} position={[0, -0.2, 0.53]} />
        </>
      );
    case "happy":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.06, 0.47]}>
            <mesh geometry={GEO.eyeHappy} material={INK} position-x={-0.17} />
            <mesh geometry={GEO.eyeHappy} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.22, 0.45]} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.22, 0.45]} />
          <mesh geometry={GEO.smile} material={INK} position={[0, -0.1, 0.49]} rotation-z={Math.PI} />
          {cheeks}
        </>
      );
    case "cool":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.06, 0.5]}>
            <mesh geometry={GEO.lens} material={INK} position-x={-0.15} />
            <mesh geometry={GEO.lens} material={INK} position-x={0.15} />
            <mesh geometry={GEO.bridge} material={INK} position-y={0.03} />
          </group>
          <mesh geometry={GEO.mouth} material={INK} position={[0.04, -0.14, 0.49]} rotation-z={0.25} />
          {cheeks}
        </>
      );
    case "sleepy":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.03, 0.48]}>
            <mesh geometry={GEO.eyeClosed} material={INK} position-x={-0.17} />
            <mesh geometry={GEO.eyeClosed} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.15, 0.46]} rotation-z={-0.12} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.15, 0.46]} rotation-z={0.12} />
          <mesh geometry={GEO.mouthO} material={INK} position={[0, -0.14, 0.48]} />
          {cheeks}
        </>
      );
    case "fierce":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.04, 0.47]}>
            <mesh geometry={GEO.eye} material={INK} position-x={-0.17} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.browThick} material={INK} position={[-0.17, 0.18, 0.46]} rotation-z={-0.4} />
          <mesh geometry={GEO.browThick} material={INK} position={[0.17, 0.18, 0.46]} rotation-z={0.4} />
          <mesh geometry={GEO.mustache} material={INK} position={[-0.08, -0.1, 0.5]} rotation-z={1.2} />
          <mesh geometry={GEO.mustache} material={INK} position={[0.08, -0.1, 0.5]} rotation-z={-1.2} />
          {cheeks}
        </>
      );
    case "wink":
      return (
        <>
          {/* Same size and height as the other faces: one eye closed (like Sleepy's), one open,
              brows level; the closed eye sits a hair forward so the faceted head can't hide it */}
          <group ref={eyesRef} position={[0, 0.05, 0.48]}>
            <mesh geometry={GEO.eyeClosed} material={INK} position={[-0.17, 0, 0.012]} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.2, 0.46]} rotation-z={0.1} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.2, 0.46]} rotation-z={-0.1} />
          <mesh geometry={GEO.smile} material={INK} position={[0.03, -0.1, 0.49]} rotation-z={Math.PI} />
          {cheeks}
        </>
      );
    case "surprised":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.06, 0.46]}>
            <mesh geometry={GEO.bigEye} material={INK} position-x={-0.17} />
            <mesh geometry={GEO.bigEye} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.25, 0.44]} rotation-z={-0.2} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.25, 0.44]} rotation-z={0.2} />
          <mesh geometry={GEO.mouthO} material={INK} position={[0, -0.15, 0.48]} scale={[1.2, 1.5, 1]} />
          {cheeks}
        </>
      );
    case "grumpy":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.03, 0.47]}>
            <mesh geometry={GEO.eye} material={INK} position-x={-0.17} scale={[1, 0.6, 1]} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.17} scale={[1, 0.6, 1]} />
          </group>
          <mesh geometry={GEO.browThick} material={INK} position={[-0.17, 0.13, 0.47]} rotation-z={-0.3} />
          <mesh geometry={GEO.browThick} material={INK} position={[0.17, 0.13, 0.47]} rotation-z={0.3} />
          <mesh geometry={GEO.smile} material={INK} position={[0, -0.18, 0.49]} />
          {cheeks}
        </>
      );
    case "sparkly":
      return (
        <>
          <group ref={eyesRef} position={[0, 0.06, 0.48]}>
            <mesh geometry={GEO.star} material={SPARKLE} position-x={-0.17} scale={[1, 1, 0.45]} rotation-z={Math.PI / 4} />
            <mesh geometry={GEO.star} material={SPARKLE} position-x={0.17} scale={[1, 1, 0.45]} rotation-z={Math.PI / 4} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.21, 0.46]} rotation-z={0.1} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.21, 0.46]} rotation-z={-0.1} />
          <mesh geometry={GEO.smile} material={INK} position={[0, -0.1, 0.49]} rotation-z={Math.PI} />
          {cheeks}
        </>
      );
    default: // determined
      return (
        <>
          <group ref={eyesRef} position={[0, 0.05, 0.47]}>
            <mesh geometry={GEO.eye} material={INK} position-x={-0.17} />
            <mesh geometry={GEO.eye} material={INK} position-x={0.17} />
          </group>
          <mesh geometry={GEO.brow} material={INK} position={[-0.17, 0.19, 0.46]} rotation-z={0.15} />
          <mesh geometry={GEO.brow} material={INK} position={[0.17, 0.19, 0.46]} rotation-z={-0.15} />
          <mesh geometry={GEO.mouth} material={INK} position={[0, -0.13, 0.49]} />
          {cheeks}
        </>
      );
  }
}

// ---------------------------------------------------------------- animal masks

type MaskId = (typeof MASKS)[number]["id"];
type HairId = (typeof HAIR_STYLES)[number]["id"];

/** Radius of the mask's hood, which covers the whole head. */
const HOOD = 0.6;

/** Position and turn of something lying on the hood at (x, y) on its front; spin turns it in place. */
function onHood(x: number, y: number, spin = 0, lift = 0) {
  const r = HOOD + lift;
  const z = Math.sqrt(Math.max(0, r * r - x * x - y * y));
  return {
    position: [x, y, z] as [number, number, number],
    rotation: [-Math.asin(y / r), Math.atan2(x, z), spin, "YXZ"] as [number, number, number, "YXZ"],
  };
}

const SIDES = [-1, 1] as const;

/** The shared parts of a mask: fur hood, eyes, muzzle and nose. */
const MASK_ART: Record<Exclude<MaskId, "none">, { fur: string; muzzle?: string; nose: string; eyeY?: number; lightEyes?: boolean }> = {
  lion: { fur: "#E3A63F", muzzle: "#F6DFAE", nose: "#7A3F2C" },
  panda: { fur: "#F4F1EA", muzzle: "#FFFFFF", nose: "#23202B", lightEyes: true },
  tiger: { fur: "#EE8A2C", muzzle: "#FBF3E4", nose: "#D9576A" },
  leopard: { fur: "#E8BE6A", muzzle: "#FBF3E4", nose: "#A85A4A" },
  monkey: { fur: "#7A5233", muzzle: "#F2C9A0", nose: "#5A3A28" },
  bear: { fur: "#8A5A36", muzzle: "#D9B58A", nose: "#2B2340" },
  dwarfbear: { fur: "#3D3030", muzzle: "#E3B874", nose: "#1E1820" },
  redpanda: { fur: "#C8552A", muzzle: "#FBF3E4", nose: "#23202B" },
  elephant: { fur: "#9AA3B2", nose: "#9AA3B2" },
  rhino: { fur: "#7F8796", muzzle: "#A3AAB8", nose: "#59606E", eyeY: 0.16 },
};

/** Round ears, standing on the hood's upper sides. */
function RoundEars({ fur, inner, size = 1, spread = 0 }: { fur: string; inner: string; size?: number; spread?: number }) {
  return SIDES.map((side) => (
    <group key={side} position={[side * (0.44 + spread), 0.42, 0.06]} rotation={[Math.PI / 2 - 0.1, 0, 0]} scale={size}>
      <group rotation-y={side * 0.7}>
        <mesh geometry={GEO.roundEar} material={colorMaterial(fur)} castShadow />
        <mesh geometry={GEO.innerEar} material={colorMaterial(inner)} position-y={0.005} />
      </group>
    </group>
  ));
}

function PointEars({ fur, inner, size = 1 }: { fur: string; inner: string; size?: number }) {
  return SIDES.map((side) => (
    <group key={side} position={[side * 0.42, 0.46, 0.04]} rotation-z={-side * 0.5} scale={size}>
      <mesh geometry={GEO.pointEar} material={colorMaterial(fur)} castShadow />
      <mesh geometry={GEO.pointEar} material={colorMaterial(inner)} position={[0, -0.04, 0.05]} scale={[0.58, 0.72, 0.72]} />
    </group>
  ));
}

function MaskExtras({ style, ears, eyeY }: { style: Exclude<MaskId, "none">; ears: boolean; eyeY: number }) {
  const fur = MASK_ART[style].fur;
  switch (style) {
    case "lion": {
      const mane = colorMaterial("#A85A22");
      // A ring round the face, open at the top so the hair has room; under a hat only its lower half
      const from = ears ? 0.72 : 1;
      const span = 2 * (1.5 - from);
      return (
        <>
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (from + (i / 10) * span);
            return <mesh key={i} geometry={GEO.mane} material={mane} position={[Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.02]} rotation-z={a - Math.PI / 2} castShadow />;
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const a = Math.PI * (from + (i / 7) * span);
            return <mesh key={i} geometry={GEO.mane} material={mane} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, -0.32]} rotation-z={a - Math.PI / 2} />;
          })}
          {ears && <RoundEars fur={fur} inner="#A85A22" size={0.72} spread={-0.02} />}
        </>
      );
    }
    case "panda":
      return (
        <>
          {SIDES.map((side) => (
            <mesh key={side} geometry={GEO.patch} material={INK} {...onHood(side * 0.21, eyeY - 0.02, side * -0.5, -0.05)} scale={[1, 1.3, 0.5]} />
          ))}
          {ears && <RoundEars fur="#23202B" inner="#23202B" />}
        </>
      );
    case "tiger":
      return (
        <>
          {SIDES.map((side) => (
            <group key={side}>
              <mesh geometry={GEO.patch} material={colorMaterial("#FBF3E4")} {...onHood(side * 0.2, eyeY + 0.09, 0, -0.03)} scale={[1, 0.5, 0.4]} />
              {[
                [0.12, 0.38, 0.1],
                [0.25, 0.32, 0.45],
                [0.47, 0.12, 1.2],
                [0.48, -0.06, 1.5],
                [0.42, -0.24, 1.9],
              ].map(([x, y, spin], i) => (
                <mesh key={i} geometry={GEO.furStripe} material={INK} {...onHood(side * x!, y!, side * spin!)} />
              ))}
            </group>
          ))}
          <mesh geometry={GEO.furStripe} material={INK} {...onHood(0, 0.42)} />
          {ears && <RoundEars fur={fur} inner="#FBF3E4" size={0.8} />}
        </>
      );
    case "leopard": {
      const spot = colorMaterial("#4A2E20");
      return (
        <>
          {[
            [0, 0.4],
            [0.14, 0.34],
            [0.3, 0.3],
            [0.08, 0.5],
            [0.25, 0.46],
            [0.42, 0.2],
            [0.48, 0.04],
            [0.5, -0.14],
            [0.4, -0.3],
            [0.34, 0.1],
          ].flatMap(([x, y], i) =>
            SIDES.map((side) => <mesh key={`${i}${side}`} geometry={GEO.furSpot} material={spot} {...onHood(side * x!, y!, i)} scale={[1, 1, 0.5]} />),
          )}
          {ears && <RoundEars fur={fur} inner="#4A2E20" size={0.72} />}
        </>
      );
    }
    case "monkey": {
      const skin = colorMaterial("#F2C9A0");
      return (
        <>
          {SIDES.map((side) => (
            <group key={side}>
              <mesh geometry={GEO.patch} material={skin} {...onHood(side * 0.17, eyeY + 0.03, 0, -0.04)} scale={[1.25, 1.2, 0.5]} />
              {/* Ears on the sides, level with the eyes */}
              <group position={[side * 0.62, 0.04, 0]} rotation-z={Math.PI / 2}>
                <mesh geometry={GEO.roundEar} material={colorMaterial(fur)} castShadow />
                <mesh geometry={GEO.innerEar} material={skin} position-z={0.03} rotation-x={-0.5} />
              </group>
            </group>
          ))}
        </>
      );
    }
    case "bear":
      return ears ? <RoundEars fur={fur} inner="#D9B58A" size={0.85} /> : null;
    case "dwarfbear":
      // A sun bear cub: dark fur, tiny ears and pale rings that keep the eyes readable
      return (
        <>
          {SIDES.map((side) => (
            <mesh key={side} geometry={GEO.patch} material={colorMaterial("#E3B874")} {...onHood(side * 0.2, eyeY, 0, -0.04)} scale={[0.8, 0.8, 0.45]} />
          ))}
          {ears && <RoundEars fur={fur} inner="#E3B874" size={0.58} spread={-0.05} />}
        </>
      );
    case "redpanda": {
      const white = colorMaterial("#FBF3E4");
      const dark = colorMaterial("#4A2318");
      return (
        <>
          {SIDES.map((side) => (
            <group key={side}>
              <mesh geometry={GEO.patch} material={white} {...onHood(side * 0.21, eyeY + 0.11, side * 0.2, -0.03)} scale={[0.8, 0.5, 0.4]} />
              <mesh geometry={GEO.patch} material={white} {...onHood(side * 0.38, -0.14, 0, -0.04)} scale={[1, 1, 0.45]} />
              <mesh geometry={GEO.furStripe} material={dark} {...onHood(side * 0.22, -0.07, side * 0.12)} scale={[1.1, 0.7, 1]} />
            </group>
          ))}
          {ears && <PointEars fur={fur} inner="#FBF3E4" />}
        </>
      );
    }
    case "elephant": {
      const skin = colorMaterial(fur);
      return (
        <>
          {SIDES.map((side) => (
            <group key={side}>
              <group position={[side * 0.78, -0.02, -0.12]} rotation={[0, side * 0.42, side * 0.12]}>
                <mesh geometry={GEO.bigEar} material={skin} scale={[1, 1.12, 0.2]} castShadow />
                <mesh geometry={GEO.bigEar} material={colorMaterial("#E6A9B4")} position-z={0.03} scale={[0.68, 0.8, 0.16]} />
              </group>
              <mesh geometry={GEO.tusk} material={MASK_WHITE} position={[side * 0.2, -0.3, 0.6]} rotation-x={Math.PI - 0.55} castShadow />
            </group>
          ))}
          {/* The trunk swings out over the belly, tip turned up */}
          {[
            [-0.06, 0.66, 0.2, 1.1],
            [-0.22, 0.73, 0.1, 0.98],
            [-0.38, 0.78, 0.25, 0.86],
            [-0.52, 0.87, 0.85, 0.76],
          ].map(([y, z, rx, size], i) => (
            <mesh key={i} geometry={GEO.trunk} material={skin} position={[0, y!, z!]} rotation-x={rx!} scale={size!} castShadow />
          ))}
        </>
      );
    }
    case "rhino": {
      const horn = colorMaterial("#D8CDB6");
      return (
        <>
          <mesh geometry={GEO.animalHorn} material={horn} position={[0, 0.08, 0.76]} rotation-x={0.42} castShadow />
          <mesh geometry={GEO.animalHorn} material={horn} position={[0, 0.3, 0.57]} rotation-x={0.3} scale={0.5} />
          {ears && <PointEars fur={fur} inner="#C7A5A5" size={0.9} />}
        </>
      );
    }
  }
}

/** A full animal head worn over the wrestler's own: faces hide under it. */
function AnimalMask({ style, eyesRef, ears }: { style: Exclude<MaskId, "none">; eyesRef: RefObject<Group | null>; ears: boolean }) {
  const art = MASK_ART[style];
  const eyeY = art.eyeY ?? 0.1;
  return (
    <>
      <mesh geometry={GEO.hood} material={colorMaterial(art.fur)} castShadow />
      <group ref={eyesRef} position={[0, eyeY, 0.56]}>
        {SIDES.map((side) => (
          <mesh key={side} geometry={GEO.eye} material={art.lightEyes ? WHITE : INK} position-x={side * 0.2} scale={art.lightEyes ? 0.8 : 1} />
        ))}
      </group>
      {art.muzzle && (
        <>
          <mesh geometry={GEO.muzzle} material={colorMaterial(art.muzzle)} position={[0, -0.16, 0.44]} scale={style === "rhino" ? [1.15, 1, 1.25] : [1, 0.82, 0.9]} castShadow />
          <mesh geometry={GEO.animalNose} material={colorMaterial(art.nose)} position={[0, -0.08, 0.68]} scale={[1, 0.7, 0.7]} />
        </>
      )}
      <MaskExtras style={style} ears={ears} eyeY={eyeY} />
    </>
  );
}

/** How a hair style sits on a mask: moved, scaled or hidden, and whether the ears still fit. */
interface HairFit {
  scale?: number;
  y?: number;
  z?: number;
  hide?: boolean;
  /** Ears (and a lion's upper mane) off: hats and hair they would otherwise pierce. */
  noEars?: boolean;
}

const NO_MASK_FIT: HairFit = { scale: 1 };

/** Every style on the larger hood, before any changes for one animal. */
const HOOD_FIT: Record<HairId, HairFit> = {
  topknot: { scale: 1.15 },
  bald: {},
  spiky: { scale: 1.15 },
  bowl: { scale: 1.2, noEars: true },
  mohawk: { scale: 1.15 },
  ponytail: { scale: 1.15 },
  afro: { scale: 0.98, y: 0.06, z: -0.06, noEars: true },
  buns: { scale: 1.15, z: -0.18 },
  samurai: { scale: 0.98, y: 0.15 },
  kasa: { scale: 1.15, y: 0.14, noEars: true },
  kabuto: { scale: 1.15, noEars: true },
  crown: { scale: 0.85, y: 0.08 },
};

/** Changes for one animal. Side ears, the trunk and the horns clear every style as they are. */
const MASK_FIT: Partial<Record<MaskId, Partial<Record<HairId, HairFit>>>> = {
  // Big enough to stand clear of both, and a panda needs its ears
  panda: { bowl: { noEars: false }, afro: { noEars: false } },
};

function hairFit(mask: MaskId, hair: HairId): HairFit {
  if (mask === "none") return NO_MASK_FIT;
  return { ...HOOD_FIT[hair], ...MASK_FIT[mask]?.[hair] };
}

// ---------------------------------------------------------------- outfit

function Outfit({ style, color }: { style: string; color: string }) {
  const belt = colorMaterial(color);
  const base = <mesh geometry={GEO.belt} material={belt} position-y={0.2} castShadow />;
  switch (style) {
    case "striped":
      return (
        <>
          {base}
          <mesh geometry={GEO.beltStripe} material={WHITE} position-y={0.29} />
          <mesh geometry={GEO.beltStripe} material={WHITE} position-y={0.11} />
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
    case "apron":
      return (
        <>
          {base}
          <mesh geometry={GEO.apron} material={belt} position={[0, -0.06, 0.7]} rotation-x={-0.08} castShadow />
          <mesh geometry={GEO.emblem} material={GOLD} position={[0, -0.02, 0.735]} rotation-x={-0.08} />
        </>
      );
    case "champion":
      return (
        <>
          {base}
          <mesh geometry={GEO.rope} material={WHITE} position-y={0.22} rotation-x={Math.PI / 2} castShadow />
          {[-0.22, 0, 0.22].map((x) => (
            <mesh key={x} geometry={GEO.shide} material={WHITE} position={[x, 0.04, 0.78]} rotation-z={x * 0.8} />
          ))}
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
    case "polka":
      return (
        <>
          {base}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <mesh key={i} geometry={GEO.dot} material={WHITE} position={[Math.sin(a) * 0.75, 0.2 + (i % 2 ? 0.06 : -0.06), Math.cos(a) * 0.75]} />;
          })}
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
    case "sagari":
      return (
        <>
          {base}
          {Array.from({ length: 9 }, (_, i) => {
            const a = ((i - 4) / 9) * Math.PI * 0.9;
            return <mesh key={i} geometry={GEO.sagari} material={belt} position={[Math.sin(a) * 0.72, -0.08, Math.cos(a) * 0.72]} />;
          })}
        </>
      );
    case "cape":
      return (
        <>
          {base}
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
          <mesh geometry={GEO.cape} material={belt} position={[0, 0.55, -0.7]} rotation-x={0.18} castShadow />
          <mesh geometry={GEO.dot} material={GOLD} position={[-0.42, 1.0, -0.6]} />
          <mesh geometry={GEO.dot} material={GOLD} position={[0.42, 1.0, -0.6]} />
        </>
      );
    case "sakura":
      // Pink blossoms dotted round the belt
      return (
        <>
          {base}
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <mesh key={i} geometry={GEO.dot} material={SAKURA} position={[Math.sin(a) * 0.75, 0.2 + (i % 2 ? 0.07 : -0.05), Math.cos(a) * 0.75]} scale={1.25} />;
          })}
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
    case "dragon":
      // A black belt with gold studs and the champion's rope
      return (
        <>
          <mesh geometry={GEO.belt} material={DRAGON} position-y={0.2} castShadow />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <mesh key={i} geometry={GEO.dot} material={GOLD} position={[Math.sin(a) * 0.76, 0.2, Math.cos(a) * 0.76]} scale={0.8} />;
          })}
          <mesh geometry={GEO.rope} material={GOLD} position-y={0.31} rotation-x={Math.PI / 2} castShadow />
          <mesh geometry={GEO.flap} material={DRAGON} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
    case "kesho":
      // The ceremonial apron of the top wrestlers: apron, emblem, rope and paper strips
      return (
        <>
          {base}
          <mesh geometry={GEO.rope} material={WHITE} position-y={0.22} rotation-x={Math.PI / 2} castShadow />
          <mesh geometry={GEO.apron} material={belt} position={[0, -0.06, 0.7]} rotation-x={-0.08} castShadow />
          <mesh geometry={GEO.emblem} material={GOLD} position={[0, -0.02, 0.735]} rotation-x={-0.08} />
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} geometry={GEO.shide} material={WHITE} position={[x, 0.02, 0.74]} rotation-z={x * 0.8} />
          ))}
        </>
      );
    case "golden":
      // All gold: the belt, its flap and the rope
      return (
        <>
          <mesh geometry={GEO.belt} material={GOLD} position-y={0.2} castShadow />
          <mesh geometry={GEO.rope} material={GOLD} position-y={0.22} rotation-x={Math.PI / 2} castShadow />
          <mesh geometry={GEO.flap} material={GOLD} position={[0, 0.12, 0.66]} castShadow />
          <mesh geometry={GEO.emblem} material={GEM} position={[0, 0.2, 0.79]} />
        </>
      );
    default: // classic and armbands (bands are drawn on the arms)
      return (
        <>
          {base}
          <mesh geometry={GEO.flap} material={belt} position={[0, 0.12, 0.66]} castShadow />
        </>
      );
  }
}

// ---------------------------------------------------------------- model

/**
 * A compact toy sumo: big head, round body, short limbs and a mawashi belt in the player's
 * slot colour. Hair, face, mask and outfit come from the appearance. Origin is between the feet;
 * the model faces +Z.
 */
export function SumoModel({
  parts,
  color,
  appearance = DEFAULT_APPEARANCE,
  showRing = true,
}: {
  parts: SumoParts;
  color: string;
  appearance?: Appearance;
  showRing?: boolean;
}) {
  const skin = useMemo(() => SKIN.clone(), []);
  const dashColor = useMemo(() => new Color("#ef6553"), []);
  useEffect(() => () => skin.dispose(), [skin]);
  useFrame(() => skin.color.lerpColors(SKIN.color, dashColor, Math.min(1, parts.dashStrength.current) * 0.28));
  const hairStyle = HAIR_STYLES[appearance.hair]?.id ?? "topknot";
  const hairColor = HAIR_COLORS[appearance.hairColor]?.hex ?? HAIR_COLORS[0].hex;
  const face = FACES[appearance.face]?.id ?? "determined";
  const outfit = OUTFITS[appearance.outfit]?.id ?? "classic";
  const mask = MASKS[appearance.mask]?.id ?? "none";
  const fit = hairFit(mask, hairStyle);
  const armband = outfit === "armbands" ? <mesh geometry={GEO.armband} material={colorMaterial(color)} position-y={-0.32} rotation-x={Math.PI / 2} /> : null;

  return (
    <group ref={parts.root}>
      {showRing && (
        <mesh ref={parts.ring} geometry={GEO.ring} material={ringMaterial(color)} rotation-x={-Math.PI / 2} position-y={0.03} renderOrder={1} />
      )}
      <mesh ref={parts.legL} geometry={GEO.leg} material={skin} position={[-0.32, 0.17, 0]} castShadow />
      <mesh ref={parts.legR} geometry={GEO.leg} material={skin} position={[0.32, 0.17, 0]} castShadow />

      <group ref={parts.torso} position-y={0.3}>
        <mesh geometry={GEO.body} material={skin} position-y={0.42} scale={[1, 0.88, 0.92]} castShadow />
        <Outfit key={outfit} style={outfit} color={color} />

        <group ref={parts.armL} position={[-0.7, 0.62, 0.05]} rotation-z={0.7}>
          <mesh geometry={GEO.arm} material={skin} position-y={-0.22} castShadow />
          {armband}
        </group>
        <group ref={parts.armR} position={[0.7, 0.62, 0.05]} rotation-z={-0.7}>
          <mesh geometry={GEO.arm} material={skin} position-y={-0.22} castShadow />
          {armband}
        </group>

        <group ref={parts.head} position-y={1.12}>
          <mesh geometry={GEO.head} material={skin} castShadow />
          {!fit.hide && (
            <group position={[0, fit.y ?? 0, fit.z ?? 0]} scale={fit.scale ?? 1}>
              <Hair key={hairStyle} style={hairStyle} color={hairColor} masked={mask !== "none"} />
            </group>
          )}
          {/* key: switching faces rebuilds them. Reusing the old meshes kept stale props: a
              removed position-x was reset to 0 after the new position, so an eye could land
              in the middle of the face. Same for hair and outfits. */}
          {mask === "none" ? (
            <Face key={face} style={face} eyesRef={parts.eyes} />
          ) : (
            <AnimalMask key={mask} style={mask} eyesRef={parts.eyes} ears={!fit.noEars} />
          )}
        </group>
      </group>
    </group>
  );
}
