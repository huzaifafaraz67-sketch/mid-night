/**
 * THE MIDNIGHT CURFEW - HIGH FIDELITY BUILD
 * First-person psychological horror survival game set in Apartment 4B on Kessler Row.
 * Includes High Graphics engine, Chapter-based Story Mode, Survival Mode, and Practice Mode.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  RotateCcw,
  Play,
  Shield,
  Sliders,
  Tv,
  CheckCircle,
  HelpCircle,
  FolderOpen,
  X,
  Lock,
  Compass
} from 'lucide-react';
import { sound } from './game/audio';
import {
  createFloorTexture,
  createWallpaperTexture,
  createWoodTexture,
  createHallwayTexture,
  createDustMoteTexture,
  createCanvasTexture,
  createBaseboardTexture,
  createEtchingTexture
} from './game/textures';
import {
  STORY_CHAPTERS,
  LORE_DOCUMENTS,
  SECRET_ENDINGS
} from './game/story';
import { GameMode, GraphicPreset, NoteDocument, SecretEndingInfo } from './game/types';

export default function App() {
  // Game state
  const [mode, setMode] = useState<GameMode>('menu');
  const [selectedSubMode, setSelectedSubMode] = useState<'story' | 'survival' | 'practice'>('story');
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [graphicPreset, setGraphicPreset] = useState<GraphicPreset>('ultra');
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [invertY, setInvertY] = useState(false);
  const [invertX, setInvertX] = useState(false);

  // Sync references to avoid stale listener closures
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  const invertYRef = useRef(invertY);
  invertYRef.current = invertY;
  const invertXRef = useRef(invertX);
  invertXRef.current = invertX;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // In-game HUD state
  const [clockText, setClockText] = useState('11:00 PM');
  const [objectiveText, setObjectiveText] = useState('Read the rules taped to the fridge');
  const [promptText, setPromptText] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState(100);
  const [nervePercent, setNervePercent] = useState(100);
  const [isHidingInCloset, setIsHidingInCloset] = useState(false);
  const [isLatched, setIsLatched] = useState(false);
  const [isHoldingPlate, setIsHoldingPlate] = useState(false);
  const [hideCountdown, setHideCountdown] = useState<number | null>(null);
  const [hideCountdownLabel, setHideCountdownLabel] = useState('GET IN THE CUPBOARD');
  const [deathReason, setDeathReason] = useState<string | null>(null);
  const [unlockedEnding, setUnlockedEnding] = useState<SecretEndingInfo | null>(null);

  // Chores status
  const [choresVisible, setChoresVisible] = useState(false);
  const [choresState, setChoresState] = useState({
    plate: false,
    curtain: false,
    tv: false,
    hall: false
  });

  // Modal overlays
  const [activeDocument, setActiveDocument] = useState<NoteDocument | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStorySelectModal, setShowStorySelectModal] = useState(false);
  const [showRulesJournal, setShowRulesJournal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // References for Three.js
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: PointerLockControls;
    materials: Record<string, THREE.Material>;
    lights: {
      ambient: THREE.AmbientLight;
      hemi: THREE.HemisphereLight;
      bulb: THREE.PointLight;
      counterLight: THREE.PointLight;
      moon: THREE.DirectionalLight;
      hallLight: THREE.PointLight;
      hallGlow: THREE.PointLight;
      tvLight: THREE.PointLight;
      flashlight: THREE.SpotLight;
      mwLight: THREE.PointLight;
    };
    entities: {
      entityGroup: THREE.Group;
      entityEyes: THREE.PointLight;
      hips: THREE.Group;
      torso: THREE.Mesh;
      chest: THREE.Mesh;
      head: THREE.Mesh;
      armL: THREE.Group;
      armR: THREE.Group;
      foreL: THREE.Group;
      foreR: THREE.Group;
      legL: THREE.Group;
      legR: THREE.Group;
    };
    props: {
      fridgeHinge: THREE.Group;
      doorPivot: THREE.Group;
      switchNub: THREE.Mesh;
      clHingeL: THREE.Group;
      clHingeR: THREE.Group;
      curtain: THREE.Mesh;
      curtainBase: Float32Array;
      receiver: THREE.Mesh;
      mwGlass: THREE.Mesh;
      foodBox: THREE.Group;
      wallClockH: THREE.Group;
      wallClockM: THREE.Group;
      hallDoors: Array<{ group: THREE.Group; baseX: number; shake: number }>;
      dustSystem: THREE.Points | null;
      tvScreen: THREE.Mesh;
      tvCanvas: HTMLCanvasElement;
      tvCtx: CanvasRenderingContext2D;
      devRoom: THREE.Group;
    };
    interactables: THREE.Object3D[];
    blockers: Array<{ x: number; z: number; hw: number; hd: number; isDoor?: boolean }>;
    state: {
      mode: GameMode;
      gameMinutes: number;
      timeCap: number | null;
      battery: number;
      nerve: number;
      flashOn: boolean;
      hallLightOn: boolean;
      tvOn: boolean;
      fridgeOpen: boolean;
      frontOpen: boolean;
      hiding: boolean;
      latched: boolean;
      carryingPlate: boolean;
      sittingOnCouch: boolean;
      isPowerOn: boolean;
      stage: 'intro' | 'getfood' | 'heat' | 'heating' | 'collect' | 'couch' | 'eating' | 'chores' | 'sleep' | 'night' | 'dawn';
      round: number;
      roundsTotal: number;
      hideTimer: number;
      stayHiddenTimer: number;
      isSafeInCloset: boolean;
      triedClosetDoor: boolean;
      rattleAmount: number;
      knockShake: number;
      calling: boolean;
      heatTimer: number;
      hallTimer: number;
      hallWarnStep: number;
      usedFlashlightOnce: boolean;
      knockDoorMesh: THREE.Object3D | null;
      knockCount: number;
      lastKnockTime: number;
      dawnHideTimer: number;
      isDevActive: boolean;
      fridgeLastHourOpened: number;
      readRulesCount: number;
    };
    keys: Record<string, boolean>;
    touch: {
      moveX: number;
      moveY: number;
      lastLookX: number;
      lastLookY: number;
      lookId: number | null;
      isRunning: boolean;
    };
    animationId: number;
    lastTime: number;
    bobTimer: number;
    breatheTimer: number;
    yaw: number;
    pitch: number;
    justLockedTime: number;
  } | null>(null);

  const activeDocRef = useRef(activeDocument);
  activeDocRef.current = activeDocument;

  // Subtitle timer ref
  const subtitleTimeoutRef = useRef<number | null>(null);

  const displaySubtitle = useCallback((text: string, durationMs = 4500) => {
    setSubtitleText(text);
    if (subtitleTimeoutRef.current) {
      window.clearTimeout(subtitleTimeoutRef.current);
    }
    subtitleTimeoutRef.current = window.setTimeout(() => {
      setSubtitleText(null);
    }, durationMs);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    const g = gameRef.current;
    if (!isMobileDevice && g) {
      g.justLockedTime = performance.now();
      g.pitch = g.camera.rotation.x;
      g.yaw = g.camera.rotation.y;
      g.controls.lock();
    }
  }, [isMobileDevice]);

  const closeActiveDocument = useCallback(() => {
    setActiveDocument(null);
    if (!isMobileDevice && gameRef.current) {
      const m = modeRef.current;
      if (m === 'story' || m === 'survival' || m === 'practice') {
        setTimeout(() => {
          resumeGame();
        }, 50);
      }
    }
  }, [isMobileDevice, resumeGame]);

  // Detect mobile
  useEffect(() => {
    const isMobile = window.matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    setIsMobileDevice(isMobile);
  }, []);

  // Format game time
  const formatClock = (mins: number) => {
    const total = (23 * 60 + Math.floor(mins)) % 1440;
    const h24 = Math.floor(total / 60);
    const m = total % 60;
    const h = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h}:${m < 10 ? '0' : ''}${m} ${h24 < 12 ? 'AM' : 'PM'}`;
  };

  // Set up Three.js scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Dimensions
    const container = canvasContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f121a);
    scene.fog = new THREE.FogExp2(0x0f121a, 0.042);

    // Camera
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.05, 120);
    camera.position.set(0, 1.55, 4);

    // Controls (managed via custom mousemove handler to prevent 180-deg flip and support invert/reverse axes)
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.enabled = false;
    camera.rotation.order = 'YXZ';

    // Procedural textures
    const floorTextures = createFloorTexture();
    const wallpaperTextures = createWallpaperTexture();
    const woodTexture = createWoodTexture();
    const hallwayTexture = createHallwayTexture();

    // TV Canvas for real-time static
    const tvCanvas = document.createElement('canvas');
    tvCanvas.width = 128;
    tvCanvas.height = 128;
    const tvCtx = tvCanvas.getContext('2d')!;
    const tvTex = new THREE.CanvasTexture(tvCanvas);

    // Enamel fridge texture
    const texEnamel = createCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#e4dfd0';
      ctx.fillRect(0, 0, w, h);
    });

    // Note paper texture
    const texNote = createCanvasTexture(128, 160, (ctx, w, h) => {
      ctx.fillStyle = '#f6f2e2';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c8bfa2';
      for (let y = 16; y < h; y += 14) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(w - 8, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#222233';
      for (let y = 14; y < h - 8; y += 14) {
        let x = 12;
        while (x < w - 16) {
          const l = 8 + Math.random() * 24;
          ctx.fillRect(x, y - 4, l, 2.5);
          x += l + 5;
        }
      }
      ctx.fillStyle = '#aa2222';
      ctx.fillRect(10, 5, w - 20, 3.5);
    });

    // Pizza box texture
    const texPizza = createCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#c79c65';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8d281a';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('LATE NITE PIZZA', 12, 24);
    });

    // Materials map
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const materials: Record<string, THREE.Material> = {
      floor: std({
        map: floorTextures.diffuse,
        normalMap: floorTextures.normal,
        roughness: 0.68,
        metalness: 0.05
      }),
      wall: std({
        map: wallpaperTextures.diffuse,
        normalMap: wallpaperTextures.normal,
        roughness: 0.92
      }),
      hall: std({
        map: hallwayTexture,
        roughness: 0.95
      }),
      ceil: std({ color: 0x2e2e36, roughness: 0.95 }),
      wood: std({ map: woodTexture, roughness: 0.65 }),
      fridge: std({ map: texEnamel, color: 0xedeae0, roughness: 0.35, metalness: 0.25 }),
      metal: std({ color: 0xcccccc, roughness: 0.25, metalness: 0.85 }),
      dark: std({ color: 0x222228, roughness: 0.75 }),
      door: std({ map: woodTexture, color: 0xbd9164, roughness: 0.6 }),
      paper: std({ map: texNote, roughness: 0.95 }),
      glass: std({ color: 0x4a6a8c, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.3 }),
      cloth: std({ color: 0x4d5568, roughness: 1.0, side: THREE.DoubleSide }),
      screen: new THREE.MeshStandardMaterial({
        map: tvTex,
        emissiveMap: tvTex,
        emissive: 0xffffff,
        emissiveIntensity: 0,
        roughness: 0.4,
        color: 0x11161d
      }),
      coat: std({ color: 0x16151c, roughness: 0.96 }),
      mask: std({ color: 0xd4ccba, roughness: 0.55, emissive: 0x221510, emissiveIntensity: 0.25 }),
      baseboard: std({
        map: createBaseboardTexture(),
        roughness: 0.72
      })
    };

    // Lights
    const ambient = new THREE.AmbientLight(0xa5bad6, 0.55);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xa5bcd8, 0x3d352b, 0.55);
    scene.add(hemi);

    const bulb = new THREE.PointLight(0xffdcad, 14, 18, 2);
    bulb.position.set(0, 2.55, -1);
    bulb.castShadow = true;
    bulb.shadow.mapSize.set(1024, 1024);
    bulb.shadow.bias = -0.003;
    scene.add(bulb);

    const counterLight = new THREE.PointLight(0xffe2bd, 6, 12, 2);
    counterLight.position.set(-3.2, 2.4, 3.0);
    scene.add(counterLight);

    const moon = new THREE.DirectionalLight(0x8fa6db, 0.75);
    moon.position.set(9, 7, 6);
    moon.castShadow = true;
    scene.add(moon);

    const hallLight = new THREE.PointLight(0xd4e2ff, 0, 16, 2);
    hallLight.position.set(0, 2.55, -8);
    hallLight.castShadow = true;
    scene.add(hallLight);

    const hallGlow = new THREE.PointLight(0x6a81b5, 2.2, 12, 2);
    hallGlow.position.set(0, 2.4, -14);
    scene.add(hallGlow);

    const tvLight = new THREE.PointLight(0x9bd7ff, 0, 10, 2);
    tvLight.position.set(4.35, 1.25, 1.6);
    scene.add(tvLight);

    const mwLight = new THREE.PointLight(0xffa83b, 0, 3, 2);
    mwLight.position.set(-4.3, 1.24, 2.95);
    scene.add(mwLight);

    const flashlight = new THREE.SpotLight(0xfff3dc, 0, 26, Math.PI / 6.6, 0.42, 1.0);
    flashlight.castShadow = true;
    flashlight.position.set(0.22, -0.12, 0);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight, flashlight.target);
    scene.add(camera);

    // Helpers
    const interactables: THREE.Object3D[] = [];
    const tag = (meshObj: THREE.Object3D, action: string, label: string) => {
      meshObj.userData.action = action;
      meshObj.userData.label = label;
      interactables.push(meshObj);
      return meshObj;
    };
    const createBox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, shadow = true) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, y, z);
      b.rotation.y = ry;
      b.castShadow = shadow;
      b.receiveShadow = true;
      scene.add(b);
      return b;
    };

    // Collision Blockers
    const blockers: Array<{ x: number; z: number; hw: number; hd: number; isDoor?: boolean }> = [];
    const addBlocker = (x: number, z: number, hw: number, hd: number, isDoor = false) => {
      blockers.push({ x, z, hw, hd, isDoor });
    };

    // Construct Room
    const ROOM = { w: 10, d: 10, h: 3 };
    createBox(ROOM.w, 0.2, ROOM.d, materials.floor, 0, -0.1, 0, 0, false);
    createBox(ROOM.w, 0.2, ROOM.d, materials.ceil, 0, ROOM.h, 0, 0, false);

    // Full Wall Boundaries (Living Room)
    createBox(0.2, ROOM.h, ROOM.d, materials.wall, -ROOM.w / 2, ROOM.h / 2, 0); // West wall
    addBlocker(-ROOM.w / 2, 0, 0.25, ROOM.d / 2 + 0.2);

    createBox(0.2, ROOM.h, ROOM.d, materials.wall, ROOM.w / 2, ROOM.h / 2, 0); // East wall
    addBlocker(ROOM.w / 2, 0, 0.25, ROOM.d / 2 + 0.2);

    createBox(3.4, ROOM.h, 0.2, materials.wall, -3.3, ROOM.h / 2, ROOM.d / 2);
    createBox(3.4, ROOM.h, 0.2, materials.wall, 3.3, ROOM.h / 2, ROOM.d / 2);
    createBox(3.2, ROOM.h, 0.2, materials.wall, 0, ROOM.h / 2, ROOM.d / 2); // South wall
    addBlocker(0, ROOM.d / 2, ROOM.w / 2 + 0.2, 0.25);

    // North Wall Sections & Front Door Seal
    createBox(3.6, ROOM.h, 0.2, materials.wall, -3.2, ROOM.h / 2, -ROOM.d / 2);
    addBlocker(-3.2, -ROOM.d / 2, 1.85, 0.25);

    createBox(3.6, ROOM.h, 0.2, materials.wall, 3.2, ROOM.h / 2, -ROOM.d / 2);
    addBlocker(3.2, -ROOM.d / 2, 1.85, 0.25);

    createBox(2.8, 0.7, 0.2, materials.wall, 0, ROOM.h - 0.35, -ROOM.d / 2);
    // Note: West door panel (1.1, 2.3, 0.2) is constructed near line 507; blocker covers it:
    addBlocker(-0.85, -ROOM.d / 2, 0.55, 0.25);

    // Front Door closed blocker (impenetrable barrier when closed)
    addBlocker(0.55, -ROOM.d / 2, 0.85, 0.2, true);

    // Communal Hallway Walls & Full Boundaries
    createBox(2.8, 0.2, 14, materials.hall, 0, -0.1, -12, 0, false);
    createBox(2.8, 0.2, 14, materials.ceil, 0, ROOM.h, -12, 0, false);
    createBox(0.2, ROOM.h, 14, materials.hall, -1.4, ROOM.h / 2, -12);
    addBlocker(-1.4, -12, 0.25, 7.2);

    createBox(0.2, ROOM.h, 14, materials.hall, 1.4, ROOM.h / 2, -12);
    addBlocker(1.4, -12, 0.25, 7.2);

    createBox(2.8, ROOM.h, 0.2, materials.hall, 0, ROOM.h / 2, -19);
    addBlocker(0, -19, 1.6, 0.25);

    // Architectural Boundaries (Baseboards, Trims & Door Frame Casings)
    createBox(9.8, 0.16, 0.05, materials.baseboard, 0, 0.08, 4.88); // South wall baseboard
    createBox(0.05, 0.16, 9.8, materials.baseboard, -4.88, 0.08, 0); // West wall baseboard
    createBox(0.05, 0.16, 9.8, materials.baseboard, 4.88, 0.08, 0); // East wall baseboard
    createBox(3.4, 0.16, 0.05, materials.baseboard, -3.2, 0.08, -4.88); // North wall west baseboard
    createBox(3.4, 0.16, 0.05, materials.baseboard, 3.2, 0.08, -4.88); // North wall east baseboard
    createBox(1.1, 0.16, 0.05, materials.baseboard, -0.85, 0.08, -4.88); // North wall fixed panel baseboard

    createBox(0.05, 0.16, 13.8, materials.baseboard, -1.28, 0.08, -12.0); // Hallway west baseboard
    createBox(0.05, 0.16, 13.8, materials.baseboard, 1.28, 0.08, -12.0); // Hallway east baseboard
    createBox(2.5, 0.16, 0.05, materials.baseboard, 0, 0.08, -18.88); // Hallway end baseboard

    // Doorway Frame Casings
    createBox(0.08, 2.34, 0.08, materials.wood, -0.32, 1.17, -4.92);
    createBox(0.08, 2.34, 0.08, materials.wood, 1.42, 1.17, -4.92);
    createBox(1.82, 0.08, 0.08, materials.wood, 0.55, 2.34, -4.92);

    // Procedural Wall Etchings
    const texEtchHall = createEtchingTexture('hallway');
    const texEtchTally = createEtchingTexture('tally');
    const texEtchCloset = createEtchingTexture('closet');
    const texEtchWarning = createEtchingTexture('warning');
    const texEtchScratches = createEtchingTexture('scratches');

    const matEtchHall = std({ map: texEtchHall.diffuse, normalMap: texEtchHall.normal, transparent: true, opacity: 0.92, roughness: 0.75, depthWrite: false });
    const matEtchTally = std({ map: texEtchTally.diffuse, normalMap: texEtchTally.normal, transparent: true, opacity: 0.94, roughness: 0.8, depthWrite: false });
    const matEtchCloset = std({ map: texEtchCloset.diffuse, normalMap: texEtchCloset.normal, transparent: true, opacity: 0.94, roughness: 0.8, depthWrite: false });
    const matEtchWarning = std({ map: texEtchWarning.diffuse, normalMap: texEtchWarning.normal, transparent: true, opacity: 0.92, roughness: 0.78, depthWrite: false });
    const matEtchScratches = std({ map: texEtchScratches.diffuse, normalMap: texEtchScratches.normal, transparent: true, opacity: 0.9, roughness: 0.75, depthWrite: false });

    // 1. Hallway Wall Etching (Beside Apartment 4C)
    const etchingHallMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), matEtchHall);
    etchingHallMesh.position.set(-1.28, 1.55, -8.2);
    etchingHallMesh.rotation.y = Math.PI / 2;
    scene.add(etchingHallMesh);
    tag(etchingHallMesh, 'etching_hall', 'Press [E] to Inspect Hallway Etchings');

    // 2. Living Room Doorway Warning Carvings (Beside deadbolt)
    const etchingDoorMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), matEtchWarning);
    etchingDoorMesh.position.set(1.85, 1.65, -4.88);
    scene.add(etchingDoorMesh);
    tag(etchingDoorMesh, 'etching_door', 'Press [E] to Inspect Doorway Carvings');

    // 3. Kitchen Tally Etchings (Counting Curfews on west wall)
    const etchingKitchenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), matEtchTally);
    etchingKitchenMesh.position.set(-4.88, 1.6, 1.8);
    etchingKitchenMesh.rotation.y = Math.PI / 2;
    scene.add(etchingKitchenMesh);
    tag(etchingKitchenMesh, 'etching_kitchen', 'Press [E] to Inspect Tally Marks');

    // 4. Living Room East Wall Claw Marks (Scratched down by window)
    const etchingWindowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), matEtchScratches);
    etchingWindowMesh.position.set(4.88, 1.7, -0.6);
    etchingWindowMesh.rotation.y = -Math.PI / 2;
    scene.add(etchingWindowMesh);
    tag(etchingWindowMesh, 'etching_window', 'Press [E] to Inspect Window Claw Marks');

    // 5. Far Hallway Scratch Marks (Near condemned 4F and Ada's shoes)
    const etchingFarHallMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), matEtchScratches);
    etchingFarHallMesh.position.set(1.28, 1.5, -17.2);
    etchingFarHallMesh.rotation.y = -Math.PI / 2;
    scene.add(etchingFarHallMesh);
    tag(etchingFarHallMesh, 'etching_farhall', 'Press [E] to Inspect Far Hallway Gouges');

    // Window & Swaying Curtain
    createBox(0.06, 1.4, 2.3, materials.glass, ROOM.w / 2 - 0.12, 1.75, -2.0, 0, false);
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.7, 14, 8), materials.cloth);
    curtain.rotation.y = -Math.PI / 2;
    curtain.position.set(ROOM.w / 2 - 0.28, 1.75, -2.0);
    curtain.receiveShadow = true;
    scene.add(curtain);
    const curtainBase = Float32Array.from(curtain.geometry.attributes.position.array);
    tag(curtain, 'curtain', 'Press [E] to Close the Curtain');

    // Furniture & Blockers
    createBox(3.0, 0.9, 0.85, materials.wood, -3.2, 0.45, 3.35); // Kitchen counter
    createBox(3.05, 0.06, 0.9, materials.metal, -3.2, 0.92, 3.35);
    addBlocker(-3.2, 3.35, 1.5, 0.48);

    createBox(1.7, 0.08, 1.1, materials.wood, 3.0, 0.75, -1.0); // Dining table
    addBlocker(3.0, -1.0, 0.9, 0.6);

    const sinkBasin = createBox(0.86, 0.12, 0.56, materials.metal, -3.95, 0.94, 3.35, 0, false);
    tag(sinkBasin, 'sink', 'Press [E] to Use the Sink');

    // Microwave
    const mwPanel = createBox(0.4, 0.34, 0.04, materials.dark, -4.3, 1.24, 3.09, 0, false);
    tag(mwPanel, 'microwave', 'Press [E] to Use the Microwave');
    const mwGlass = createBox(0.26, 0.22, 0.03, new THREE.MeshStandardMaterial({
      color: 0x241f14,
      emissive: 0xffa83b,
      emissiveIntensity: 0,
      roughness: 0.4
    }), -4.3, 1.24, 3.07, 0, false);

    // Fridge
    const fridge = new THREE.Group();
    fridge.position.set(-4.15, 0, -3.6);
    fridge.rotation.y = Math.PI * 0.06;
    const fBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, 0.92), materials.fridge);
    fBody.position.set(0, 1.02, 0);
    fridge.add(fBody);

    const fridgeHinge = new THREE.Group();
    fridgeHinge.position.set(-0.57, 0, 0.46);
    fridge.add(fridgeHinge);

    const fDoor = new THREE.Mesh(new THREE.BoxGeometry(1.14, 1.32, 0.07), materials.fridge);
    fDoor.position.set(0.57, 0.7, 0.02);
    fridgeHinge.add(fDoor);

    const fNote = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.015), materials.paper);
    fNote.position.set(-0.16, 1.02, 0.06);
    fNote.rotation.z = 0.05;
    fridgeHinge.add(fNote);
    tag(fNote, 'rules', 'Press [E] to Read the Midnight Rules');

    scene.add(fridge);
    addBlocker(-4.15, -3.6, 0.72, 0.45);
    tag(fBody, 'fridge', 'Press [E] to Open the Fridge');
    tag(fDoor, 'fridge', 'Press [E] to Open the Fridge');

    // Front Door & Deadbolt
    createBox(1.1, 2.3, 0.2, materials.wall, -0.85, 1.15, -ROOM.d / 2);
    const doorPivot = new THREE.Group();
    doorPivot.position.set(1.4, 0, -ROOM.d / 2 + 0.08);
    scene.add(doorPivot);

    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.12), materials.door);
    frontDoor.position.set(-0.85, 1.15, 0);
    doorPivot.add(frontDoor);
    tag(frontDoor, 'door', 'Press [E] to Interact with Front Door');

    const boltPlate = createBox(0.12, 0.3, 0.06, materials.dark, 1.72, 1.5, -ROOM.d / 2 + 0.13, 0, false);
    tag(boltPlate, 'bolt', 'Press [E] to Turn the Deadbolt');

    // Hallway Light Switch
    const switchPlate = createBox(0.24, 0.34, 0.05, materials.fridge, -1.95, 1.42, -ROOM.d / 2 + 0.14, 0, false);
    const switchNub = createBox(0.09, 0.14, 0.06, materials.dark, -1.95, 1.46, -ROOM.d / 2 + 0.19, 0, false);
    tag(switchPlate, 'switch', 'Press [E] to Toggle Hallway Light');
    tag(switchNub, 'switch', 'Press [E] to Toggle Hallway Light');

    // Bedroom Cupboard (Safe Hiding Spot)
    const closet = new THREE.Group();
    closet.position.set(4.05, 0, -4.0);
    closet.rotation.y = -Math.PI * 0.1;
    closet.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.35, 0.06), materials.wood)); // Back
    const clSideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.35, 0.95), materials.wood);
    clSideL.position.set(-0.85, 1.17, 0);
    closet.add(clSideL);
    const clSideR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.35, 0.95), materials.wood);
    clSideR.position.set(0.85, 1.17, 0);
    closet.add(clSideR);
    const clTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.95), materials.wood);
    clTop.position.set(0, 2.34, 0);
    closet.add(clTop);

    const clHingeL = new THREE.Group();
    clHingeL.position.set(-0.82, 0, 0.47);
    closet.add(clHingeL);
    const clDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.12, 0.06), materials.door);
    clDoorL.position.set(0.4, 1.12, 0);
    clHingeL.add(clDoorL);

    const clHingeR = new THREE.Group();
    clHingeR.position.set(0.82, 0, 0.47);
    closet.add(clHingeR);
    const clDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.12, 0.06), materials.door);
    clDoorR.position.set(-0.4, 1.12, 0);
    clHingeR.add(clDoorR);

    // Cupboard interior claw etchings
    const etchingClosetMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), matEtchCloset);
    etchingClosetMesh.position.set(0, 1.35, 0.04);
    closet.add(etchingClosetMesh);
    tag(etchingClosetMesh, 'etching_closet', 'Press [E] to Inspect Closet Carvings');

    scene.add(closet);
    addBlocker(4.05, -4.0, 0.95, 0.55);
    tag(clDoorL, 'closet', 'Press [E] to Hide in the Cupboard');
    tag(clDoorR, 'closet', 'Press [E] to Hide in the Cupboard');

    // TV Set
    const tvBody = createBox(1.2, 0.85, 0.55, materials.dark, 4.35, 1.0, 1.9);
    const tvScreen = createBox(1.0, 0.65, 0.03, materials.screen, 4.35, 1.05, 1.62);
    tag(tvBody, 'tv', 'Press [E] to Toggle TV');
    tag(tvScreen, 'tv', 'Press [E] to Toggle TV');
    addBlocker(4.35, 1.9, 0.68, 0.35);

    // Couch
    const couch = new THREE.Group();
    couch.position.set(2.6, 0, 3.2);
    couch.rotation.y = -Math.PI * 0.08;
    const couchMat = std({ color: 0x484236, roughness: 0.95 });
    couch.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, 0.95), couchMat));
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.75, 0.22), couchMat);
    backrest.position.set(0, 0.72, -0.38);
    couch.add(backrest);
    scene.add(couch);
    addBlocker(2.6, 3.28, 1.18, 0.44);
    tag(couch, 'couch', 'Press [E] to Sit on the Couch');

    // Wall Clock
    const wallClock = new THREE.Group();
    wallClock.position.set(0, 2.62, -ROOM.d / 2 + 0.14);
    scene.add(wallClock);
    const clockCase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 20), materials.dark);
    clockCase.rotation.x = Math.PI / 2;
    wallClock.add(clockCase);
    const wallClockH = new THREE.Group();
    const handH = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.01), materials.dark);
    handH.position.set(0, 0.06, 0.05);
    wallClockH.add(handH);
    wallClock.add(wallClockH);

    const wallClockM = new THREE.Group();
    const handM = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.01), std({ color: 0x8a2020 }));
    handM.position.set(0, 0.085, 0.055);
    wallClockM.add(handM);
    wallClock.add(wallClockM);

    // Phone
    const phone = new THREE.Group();
    phone.position.set(-2.3, 0.95, 3.35);
    scene.add(phone);
    phone.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.36), materials.dark));
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.1), materials.dark);
    receiver.position.set(0, 0.09, 0);
    phone.add(receiver);
    tag(phone, 'phone', 'Press [E] to Check Phone');

    // Wall Documents & Notes
    const wallNote = createBox(0.02, 0.52, 0.4, materials.paper, -ROOM.w / 2 + 0.13, 1.72, -1.0, 0, false);
    tag(wallNote, 'letter', 'Press [E] to Read Grandma\'s Warning');

    const scheduleNote = createBox(0.02, 0.42, 0.32, materials.paper, -ROOM.w / 2 + 0.13, 1.6, 1.4, 0, false);
    tag(scheduleNote, 'schedule', 'Press [E] to Inspect Packing Plant Roster');

    // Food Box (Appears after knock)
    const foodBox = new THREE.Group();
    foodBox.position.set(0.6, 0, 3.55);
    foodBox.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), std({ map: texPizza, roughness: 0.85 })));
    foodBox.visible = false;
    scene.add(foodBox);
    tag(foodBox, 'food', 'Press [E] to Take Pizza');

    // Hallway Doors (4C, 4D, 4E, 4F)
    const hallDoors: Array<{ group: THREE.Group; baseX: number; shake: number }> = [];
    [[-1.3, -6.5, 1, '4C'], [1.3, -9.5, -1, '4D'], [-1.3, -13.0, 1, '4E'], [1.3, -16.0, -1, '4F']].forEach((d) => {
      const g = new THREE.Group();
      g.position.set(Number(d[0]), 0, Number(d[1]));
      g.rotation.y = Number(d[2]) * Math.PI / 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.15, 0.09), materials.door);
      leaf.position.set(0, 1.08, 0);
      g.add(leaf);
      tag(leaf, 'halldoor', `Press [E] to Inspect Door ${d[3]}`);
      scene.add(g);
      hallDoors.push({ group: g, baseX: Number(d[0]), shake: 0 });
    });

    // Hallway End Vase
    const vase = createBox(0.16, 0.3, 0.16, std({ color: 0x3e4a52, roughness: 0.6 }), 0, 0.95, -18.6, 0, false);
    tag(vase, 'vase', 'Press [E] to Look at Ada\'s Shoes');
    addBlocker(0, -18.6, 0.5, 0.25);

    // The Entity Model
    const entityGroup = new THREE.Group();
    entityGroup.scale.setScalar(0.78);
    const hips = new THREE.Group();
    hips.position.y = 0.98;
    entityGroup.add(hips);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.28), materials.coat);
    torso.position.set(0, 0.5, 0);
    hips.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.34, 0.3), materials.coat);
    chest.position.set(0, 1.12, 0);
    hips.add(chest);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), materials.mask);
    neck.position.set(0, 1.4, 0);
    hips.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.28), materials.mask);
    head.position.set(0, 1.72, 0);
    hips.add(head);

    // Hollow eye sockets & wide slit mouth
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), materials.dark));
    head.children[0].position.set(-0.075, 0.05, 0.14);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), materials.dark));
    head.children[1].position.set(0.075, 0.05, 0.14);

    const entityEyes = new THREE.PointLight(0xff3311, 0, 4.0, 2);
    entityEyes.position.set(0, 2.7, 0.25);
    entityGroup.add(entityEyes);

    const armL = new THREE.Group();
    armL.position.set(-0.32, 1.32, 0);
    hips.add(armL);
    armL.add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.58, 0.11), materials.coat));
    const foreL = new THREE.Group();
    foreL.position.y = -0.56;
    armL.add(foreL);
    foreL.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.09), materials.mask));

    const armR = new THREE.Group();
    armR.position.set(0.32, 1.32, 0);
    hips.add(armR);
    armR.add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.58, 0.11), materials.coat));
    const foreR = new THREE.Group();
    foreR.position.y = -0.56;
    armR.add(foreR);
    foreR.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.09), materials.mask));

    const legL = new THREE.Group();
    legL.position.set(-0.13, 0, 0);
    hips.add(legL);
    legL.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.98, 0.13), materials.coat));

    const legR = new THREE.Group();
    legR.position.set(0.13, 0, 0);
    hips.add(legR);
    legR.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.98, 0.13), materials.coat));

    entityGroup.position.set(0, 0, -14);
    entityGroup.visible = false;
    scene.add(entityGroup);

    // Dust Particle System (Atmospheric High-Graphic Feature)
    const dustCount = 800;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 12;
      dustPositions[i * 3 + 1] = Math.random() * 2.8;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.04,
      map: createDustMoteTexture(),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const dustSystem = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustSystem);

    // Hidden Dev Room
    const devRoom = new THREE.Group();
    devRoom.position.set(40, 0, -40);
    devRoom.visible = false;
    scene.add(devRoom);

    // Initial state object
    gameRef.current = {
      renderer,
      scene,
      camera,
      controls,
      materials,
      lights: {
        ambient,
        hemi,
        bulb,
        counterLight,
        moon,
        hallLight,
        hallGlow,
        tvLight,
        flashlight,
        mwLight
      },
      entities: {
        entityGroup,
        entityEyes,
        hips,
        torso,
        chest,
        head,
        armL,
        armR,
        foreL,
        foreR,
        legL,
        legR
      },
      props: {
        fridgeHinge,
        doorPivot,
        switchNub,
        clHingeL,
        clHingeR,
        curtain,
        curtainBase,
        receiver,
        mwGlass,
        foodBox,
        wallClockH,
        wallClockM,
        hallDoors,
        dustSystem,
        tvScreen,
        tvCanvas,
        tvCtx,
        devRoom
      },
      interactables,
      blockers,
      state: {
        mode: 'menu',
        gameMinutes: 0,
        timeCap: 4,
        battery: 100,
        nerve: 100,
        flashOn: false,
        hallLightOn: false,
        tvOn: false,
        fridgeOpen: false,
        frontOpen: false,
        hiding: false,
        latched: false,
        carryingPlate: false,
        sittingOnCouch: false,
        isPowerOn: true,
        stage: 'intro',
        round: 0,
        roundsTotal: 5,
        hideTimer: 0,
        stayHiddenTimer: 0,
        isSafeInCloset: false,
        triedClosetDoor: false,
        rattleAmount: 0,
        knockShake: 0,
        calling: false,
        heatTimer: 0,
        hallTimer: 0,
        hallWarnStep: 0,
        usedFlashlightOnce: false,
        knockDoorMesh: null,
        knockCount: 0,
        lastKnockTime: 0,
        dawnHideTimer: 0,
        isDevActive: false,
        fridgeLastHourOpened: -1,
        readRulesCount: 0
      },
      keys: {},
      touch: {
        moveX: 0,
        moveY: 0,
        lastLookX: 0,
        lastLookY: 0,
        lookId: null,
        isRunning: false
      },
      animationId: 0,
      lastTime: performance.now(),
      bobTimer: 0,
      breatheTimer: 0,
      yaw: 0,
      pitch: 0,
      justLockedTime: 0
    };

    // Resize Handler
    const handleResize = () => {
      if (!canvasContainerRef.current || !gameRef.current) return;
      const w = canvasContainerRef.current.clientWidth || window.innerWidth;
      const h = canvasContainerRef.current.clientHeight || window.innerHeight;
      const r = gameRef.current.renderer;
      const cam = gameRef.current.camera;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      r.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Custom mouse look handler that eliminates recentering jump & supports reverse/invert axes
    const onMouseMove = (e: MouseEvent) => {
      const g = gameRef.current;
      if (!g || !g.controls.isLocked) return;
      if (document.pointerLockElement !== g.renderer.domElement) return;

      const now = performance.now();
      // Browser Pointer Lock bug fix: when user re-locks after ESC, the browser frequently sends
      // a massive initial movement delta (recentering spike) that violently reverses/flips the camera 180°.
      if (now - g.justLockedTime < 140) {
        return;
      }

      // Filter abnormal delta jumps
      if (Math.abs(e.movementX) > 160 || Math.abs(e.movementY) > 160) {
        return;
      }

      const multX = invertXRef.current ? -1 : 1;
      const multY = invertYRef.current ? 1 : -1;
      const sens = sensitivityRef.current * 0.0022;

      g.yaw -= e.movementX * sens * multX;
      g.pitch += e.movementY * sens * multY;

      // Restrict vertical pitch to prevent gimbal lock and upside-down flip
      const MAX_PITCH = Math.PI / 2.15;
      g.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, g.pitch));

      g.camera.rotation.set(g.pitch, g.yaw, 0, 'YXZ');
    };
    window.addEventListener('mousemove', onMouseMove);

    // Pointer Lock events
    const onLock = () => {
      const g = gameRef.current;
      if (g) {
        g.justLockedTime = performance.now();
        g.pitch = g.camera.rotation.x;
        g.yaw = g.camera.rotation.y;
      }
      setIsPaused(false);
    };
    const onUnlock = () => {
      const m = gameRef.current?.state.mode;
      if (m === 'story' || m === 'survival' || m === 'practice') {
        if (!activeDocRef.current) {
          setIsPaused(true);
        }
      }
    };
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    // Keyboard bindings
    const onKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      gameRef.current.keys[e.code] = true;

      if (e.code === 'KeyF') {
        toggleFlashlight();
      }
      if (e.code === 'KeyQ') {
        toggleLatch();
      }
      if (e.code === 'KeyE') {
        performInteraction();
      }
      if (e.code === 'Escape') {
        if (activeDocRef.current) {
          closeActiveDocument();
          return;
        }
        if (showSettingsModal) {
          setShowSettingsModal(false);
          return;
        }
        if (showHowToPlay) {
          setShowHowToPlay(false);
          return;
        }
        if (showRulesJournal) {
          setShowRulesJournal(false);
          return;
        }
        if (showStorySelectModal) {
          setShowStorySelectModal(false);
          return;
        }

        const m = modeRef.current;
        if (m === 'story' || m === 'survival' || m === 'practice') {
          if (isPausedRef.current) {
            resumeGame();
          }
          // Note: if not paused, browser ESC automatically unlocks pointer lock and fires onUnlock -> setIsPaused(true)
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      gameRef.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game Loop
    let lastAnimTime = performance.now();
    const animate = (now: number) => {
      gameRef.current!.animationId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastAnimTime) / 1000);
      lastAnimTime = now;

      const g = gameRef.current;
      if (!g) return;

      // Animate dust particles
      if (g.props.dustSystem) {
        const positions = g.props.dustSystem.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= dt * 0.05;
          if (positions[i + 1] < 0) positions[i + 1] = 2.8;
          positions[i] += Math.sin(now * 0.001 + i) * dt * 0.02;
        }
        g.props.dustSystem.geometry.attributes.position.needsUpdate = true;
      }

      // If in Menu mode, do live camera orbit
      if (g.state.mode === 'menu') {
        const t = now * 0.00015;
        g.camera.position.set(
          Math.sin(t) * 2.2 + 0.4,
          1.65 + Math.sin(t * 2) * 0.08,
          2.6 + Math.cos(t) * 0.9
        );
        g.camera.lookAt(-3.4, 1.35, -3.4);
      } else if (g.state.mode === 'story' || g.state.mode === 'survival' || g.state.mode === 'practice') {
        if (!isPausedRef.current) {
          // Player Movement
          updatePlayerMovement(dt);
          // Script Logic (Story & Survival countdowns)
          updateGameScript(dt, now);
          // Entity behaviors
          updateEntityAnimation(dt, now);
        }
        // Props & lights animation
        updatePropsAndLights(dt, now);
        if (!isPausedRef.current) {
          // Update raycaster for focus prompt
          updateInteractionPrompt();
        }
      }

      g.renderer.render(g.scene, g.camera);
    };

    gameRef.current.animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      if (gameRef.current) {
        cancelAnimationFrame(gameRef.current.animationId);
        gameRef.current.renderer.dispose();
      }
    };
  }, []);

  // Update Player Movement & Collision
  const updatePlayerMovement = (dt: number) => {
    const g = gameRef.current;
    if (!g || g.state.hiding || g.state.sittingOnCouch) return;

    let f = 0;
    let s = 0;
    if (g.keys['KeyW'] || g.keys['ArrowUp']) f += 1;
    if (g.keys['KeyS'] || g.keys['ArrowDown']) f -= 1;
    if (g.keys['KeyD'] || g.keys['ArrowRight']) s += 1;
    if (g.keys['KeyA'] || g.keys['ArrowLeft']) s -= 1;

    // Mobile touch controls
    if (g.touch.moveY !== 0) f -= g.touch.moveY;
    if (g.touch.moveX !== 0) s += g.touch.moveX;

    const isRunning = (g.keys['ShiftLeft'] || g.keys['ShiftRight'] || g.touch.isRunning) && (f !== 0 || s !== 0);
    const speed = (isRunning ? 4.2 : 2.6) * Math.min(1, Math.hypot(f, s));

    const p = g.camera.position;
    g.breatheTimer += dt;

    if (f !== 0 || s !== 0) {
      const fwd = new THREE.Vector3();
      g.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const right = new THREE.Vector3().copy(fwd).cross(new THREE.Vector3(0, 1, 0)).normalize();

      const nextX = p.x + (fwd.x * f + right.x * s) * speed * dt;
      const nextZ = p.z + (fwd.z * f + right.z * s) * speed * dt;

      // Player physical collision radius
      const RAD = 0.32;

      // Build active AABB obstacle list
      const activeBoxes: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
      for (const b of g.blockers) {
        // If it's the front door, it only blocks when door is closed
        if (b.isDoor && g.state.frontOpen) continue;
        activeBoxes.push({
          minX: b.x - b.hw,
          maxX: b.x + b.hw,
          minZ: b.z - b.hd,
          maxZ: b.z + b.hd
        });
      }
      if (g.state.frontOpen) {
        // Swung-open door leaf obstacle in hallway
        activeBoxes.push({
          minX: 1.05,
          maxX: 1.45,
          minZ: -6.7,
          maxZ: -4.95
        });
      }

      const intersectsAny = (cx: number, cz: number, r = RAD) => {
        for (const box of activeBoxes) {
          const closestX = Math.max(box.minX, Math.min(cx, box.maxX));
          const closestZ = Math.max(box.minZ, Math.min(cz, box.maxZ));
          const diffX = cx - closestX;
          const diffZ = cz - closestZ;
          if (diffX * diffX + diffZ * diffZ < r * r) {
            return true;
          }
        }
        return false;
      };

      // 1. Sliding along walls: test X and Z independently
      if (!intersectsAny(nextX, p.z)) {
        p.x = nextX;
      }
      if (!intersectsAny(p.x, nextZ)) {
        p.z = nextZ;
      }

      // 2. Resolve diagonal corner penetration (push-out)
      if (intersectsAny(p.x, p.z)) {
        for (const box of activeBoxes) {
          const closestX = Math.max(box.minX, Math.min(p.x, box.maxX));
          const closestZ = Math.max(box.minZ, Math.min(p.z, box.maxZ));
          const diffX = p.x - closestX;
          const diffZ = p.z - closestZ;
          const distSq = diffX * diffX + diffZ * diffZ;
          if (distSq < RAD * RAD && distSq > 0.000001) {
            const d = Math.sqrt(distSq);
            const pen = RAD - d;
            p.x += (diffX / d) * pen;
            p.z += (diffZ / d) * pen;
          }
        }
      }

      // 3. Strict Boundary Containment
      if (p.z > -4.95) {
        // Inside Apartment 4B
        p.x = Math.max(-4.55, Math.min(4.55, p.x));
        p.z = Math.min(4.55, p.z);
        // Can only exit north through doorway if door is open and player is aligned
        if (!g.state.frontOpen || p.x < -0.15 || p.x > 1.15) {
          p.z = Math.max(-4.65, p.z);
        }
      } else {
        // Inside Communal Hallway
        p.x = Math.max(-0.95, Math.min(0.95, p.x));
        p.z = Math.max(-18.5, p.z);
        // Can only enter south through doorway if door is open and player is aligned
        if (!g.state.frontOpen || p.x < -0.15 || p.x > 1.15) {
          p.z = Math.min(-5.25, p.z);
        }
      }

      const prevBobStep = Math.floor(g.bobTimer / Math.PI);
      g.bobTimer += dt * (isRunning ? 13 : 9);
      if (Math.floor(g.bobTimer / Math.PI) !== prevBobStep) {
        sound.playFootstep(isRunning);
      }
    }

    // Head bobbing & breathing
    p.y = 1.55 + Math.sin(g.bobTimer) * 0.03 + Math.sin(g.breatheTimer * 1.8) * 0.012;
  };

  // Interaction Hover Prompt
  const updateInteractionPrompt = () => {
    const g = gameRef.current;
    if (!g || g.state.sittingOnCouch) {
      setPromptText(null);
      return;
    }

    if (g.state.hiding) {
      setPromptText(isMobileDevice ? 'Tap USE to Leave Closet • Tap LATCH' : 'Press [E] to Leave Closet • [Q] to Latch Door');
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);
    raycaster.far = 2.8;
    const hits = raycaster.intersectObjects(g.interactables, false);

    if (hits.length > 0 && hits[0].object.userData.label) {
      let label = hits[0].object.userData.label;
      if (isMobileDevice) {
        label = label.replace('Press [E] to', 'Tap to');
      }
      setPromptText(label);
    } else {
      setPromptText(null);
    }
  };

  // Perform [E] Interaction
  const performInteraction = () => {
    const g = gameRef.current;
    if (!g) return;

    if (g.state.hiding) {
      leaveCloset();
      return;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);
    raycaster.far = 2.8;
    const hits = raycaster.intersectObjects(g.interactables, false);
    if (hits.length === 0) return;

    const target = hits[0].object;
    const action = target.userData.action;

    switch (action) {
      case 'rules': {
        sound.playDoor(true);
        g.state.fridgeOpen = true;
        setTimeout(() => {
          if (g) g.state.fridgeOpen = false;
        }, 4000);
        setActiveDocument(LORE_DOCUMENTS.rules);
        g.state.readRulesCount++;
        if (g.state.stage === 'intro') {
          g.state.stage = 'getfood';
          setObjectiveText('Take leftovers from the fridge');
          displaySubtitle('Grandma left a plate on the middle shelf. Warm it up in the microwave.');
        }
        break;
      }
      case 'fridge': {
        sound.playDoor(!g.state.fridgeOpen);
        g.state.fridgeOpen = !g.state.fridgeOpen;
        if (g.state.stage === 'getfood') {
          g.state.stage = 'heat';
          g.state.carryingPlate = true;
          setIsHoldingPlate(true);
          setObjectiveText('Put the plate in the microwave');
          displaySubtitle('You lift the cold plate out. Carry it to the counter microwave.');
        } else {
          displaySubtitle(g.state.fridgeOpen ? 'Cold air washes over your slippers.' : 'You shut the fridge tightly.');
        }
        break;
      }
      case 'microwave': {
        if (g.state.stage === 'heat' && g.state.carryingPlate) {
          g.state.stage = 'heating';
          g.state.carryingPlate = false;
          setIsHoldingPlate(false);
          g.state.heatTimer = 0;
          sound.playSwitch();
          setObjectiveText('Wait for the microwave to heat');
          displaySubtitle('The microwave hums. The smell of roasted chicken warms the kitchen.');
          setTimeout(() => {
            sound.playKnock();
            displaySubtitle('Three heavy knocks echo on the front door. Polite. Rule 2: Anyone knocking before 6:00 AM is not Mom.');
          }, 4500);
        } else if (g.state.stage === 'collect') {
          g.state.stage = 'couch';
          g.state.carryingPlate = true;
          setIsHoldingPlate(true);
          sound.playDoor(true);
          setObjectiveText('Sit down on the couch to eat');
          displaySubtitle('You take the steaming plate. Take a seat on the living room couch.');
        }
        break;
      }
      case 'couch': {
        if (g.state.stage === 'couch' && g.state.carryingPlate) {
          g.state.stage = 'eating';
          g.state.carryingPlate = false;
          setIsHoldingPlate(false);
          g.camera.position.set(2.6, 1.25, 3.05);
          g.state.sittingOnCouch = true;
          setObjectiveText('Eating dinner on the couch...');
          displaySubtitle('You eat in the dim light of the living room. The clock is slowly ticking.');
          setTimeout(() => {
            // Chores stage
            g.state.sittingOnCouch = false;
            g.camera.position.set(2.6, 1.55, 2.6);
            g.state.stage = 'chores';
            g.state.carryingPlate = true;
            setIsHoldingPlate(true);
            setChoresVisible(true);
            setObjectiveText('Complete Grandma\'s 4 Midnight Chores before sleeping');
            displaySubtitle('You wake up with a stiff neck. Complete the list before you dare sleep: wash plate, close curtain, TV off, hall switch off.');
          }, 7000);
        } else if (g.state.stage === 'chores' && Object.values(choresState).every(Boolean)) {
          // Fall asleep
          fallAsleep();
        }
        break;
      }
      case 'sink': {
        if (g.state.stage === 'chores' && !choresState.plate) {
          sound.playDoor(false);
          setChoresState((prev) => ({ ...prev, plate: true }));
          g.state.carryingPlate = false;
          setIsHoldingPlate(false);
          displaySubtitle('You rinse the dish under cold water and stack it on the drying rack.');
        } else {
          sound.playNoise(0.4, 400, 0.2);
          displaySubtitle('Cold city water gurgles through the old iron pipes.');
        }
        break;
      }
      case 'curtain': {
        g.props.curtain.scale.x = g.props.curtain.scale.x > 0.6 ? 0.4 : 1.0;
        sound.playNoise(0.3, 300, 0.2);
        if (g.state.stage === 'chores') {
          setChoresState((prev) => ({ ...prev, curtain: true }));
        }
        displaySubtitle('You adjust the curtain. The dark empty street stretches below.');
        break;
      }
      case 'tv': {
        sound.playSwitch();
        g.state.tvOn = !g.state.tvOn;
        if (g.state.stage === 'chores' && !g.state.tvOn) {
          setChoresState((prev) => ({ ...prev, tv: true }));
        }
        displaySubtitle(g.state.tvOn ? 'White static crackles from the CRT screen.' : 'You power down the television.');
        break;
      }
      case 'switch': {
        sound.playSwitch();
        g.state.hallLightOn = !g.state.hallLightOn;
        if (g.state.stage === 'chores' && !g.state.hallLightOn) {
          setChoresState((prev) => ({ ...prev, hall: true }));
        }
        displaySubtitle(g.state.hallLightOn ? 'The fluorescent tube in the hallway buzzes to life.' : 'Hallway light switched off.');
        break;
      }
      case 'bolt': {
        sound.playLatch();
        displaySubtitle('The heavy iron deadbolt is firmly engaged.');
        break;
      }
      case 'closet': {
        enterCloset();
        break;
      }
      case 'letter': {
        sound.playNoise(0.2, 800, 0.2);
        setActiveDocument(LORE_DOCUMENTS.grandmaLetter);
        break;
      }
      case 'schedule': {
        sound.playNoise(0.2, 800, 0.2);
        setActiveDocument(LORE_DOCUMENTS.plantSchedule);
        break;
      }
      case 'halldoor': {
        sound.playKnock(0.6);
        const now = performance.now();
        if (now - g.state.lastKnockTime < 4000) {
          g.state.knockCount++;
          if (g.state.knockCount >= 3) {
            triggerSecretEnding('guest');
            return;
          }
        } else {
          g.state.knockCount = 1;
        }
        g.state.lastKnockTime = now;
        displaySubtitle('Locked from the inside. Condemned since the fire.');
        break;
      }
      case 'vase': {
        sound.playWhisper();
        if (g.state.flashOn && !g.state.hallLightOn) {
          triggerSecretEnding('shoes');
          return;
        }
        displaySubtitle('A pair of small girls\' shoes rest by the baseboard, laces tied, pointing at the concrete wall.');
        break;
      }
      case 'door': {
        if (g.state.stage === 'dawn') {
          // Survived & Mom arrived!
          completeNightWin();
        } else {
          sound.playDoor(false);
          displaySubtitle('Rule 2: Mom comes home at 6:00 AM. Never unlock the front door before sunrise.');
        }
        break;
      }
      case 'etching_hall': {
        sound.playNoise(0.2, 500, 0.3);
        displaySubtitle('Deep nail gouges in the corridor plaster: "IT WEARS HER FACE — OCT 14 — ADA 4C. DO NOT OPEN AT NIGHT." The gouges were carved from the inside out.', 6000);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
      case 'etching_door': {
        sound.playLatch();
        displaySubtitle('Drywall carved with a metal key: "RULE 1: LATCH IT. RULE 2: MOM IS 6:00 AM. ANYONE ELSE IS IT." A violent strike scratches across the words.', 5500);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
      case 'etching_kitchen': {
        sound.playNoise(0.15, 800, 0.25);
        displaySubtitle('34 clusters of tally marks cut into the wallpaper with a kitchen knife. Beneath them: "NIGHT 34 — STILL WAITING. Mom was 4 minutes late. Something stood outside."', 6000);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
      case 'etching_closet': {
        sound.playWhisper();
        displaySubtitle('Fingernails scraped into the pine backboard: "KEEP THE LATCH SHUT. IT MIMICS OUR VOICES. DON\'T LOOK OUT." A splintered nail is still wedged in the grain.', 6000);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
      case 'etching_window': {
        sound.playNoise(0.25, 350, 0.2);
        displaySubtitle('Four long claw marks dragged down through the floral wallpaper to bare concrete. Whatever was on the fire escape tested the window glass.', 5500);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
      case 'etching_farhall': {
        sound.playWhisper();
        displaySubtitle('At the condemned end of the corridor, frantic gouges dig into the plaster surrounding Ada\'s shoes: "NO FOOTPRINTS. IT DOESN\'T WALK."', 6000);
        g.state.nerve = Math.min(100, g.state.nerve + 12);
        setNervePercent(Math.round(g.state.nerve));
        break;
      }
    }
  };

  // Closet Hiding Logic
  const enterCloset = () => {
    const g = gameRef.current;
    if (!g || g.state.hiding) return;
    g.state.hiding = true;
    setIsHidingInCloset(true);
    g.camera.position.set(4.05, 1.3, -4.0);
    sound.playDoor(false);
    displaySubtitle('You squeeze into the dark closet and pull the doors shut.');
  };

  const leaveCloset = () => {
    const g = gameRef.current;
    if (!g || !g.state.hiding) return;
    g.state.hiding = false;
    g.state.latched = false;
    setIsHidingInCloset(false);
    setIsLatched(false);
    g.camera.position.set(3.8, 1.55, -2.8);
    sound.playDoor(true);
    displaySubtitle('You push the closet doors open and step back into the bedroom.');
  };

  const toggleLatch = () => {
    const g = gameRef.current;
    if (!g || !g.state.hiding) return;
    g.state.latched = !g.state.latched;
    setIsLatched(g.state.latched);
    sound.playLatch();
    displaySubtitle(g.state.latched ? 'You hook the metal latch into the slot. Locked from the inside.' : 'You unhook the closet latch.');
  };

  const toggleFlashlight = () => {
    const g = gameRef.current;
    if (!g) return;
    if (g.state.battery <= 0) {
      displaySubtitle('The flashlight battery is completely dead.');
      return;
    }
    g.state.flashOn = !g.state.flashOn;
    g.state.usedFlashlightOnce = true;
    setFlashlightOn(g.state.flashOn);
    sound.playSwitch();
  };

  // Sleep & Power Cut
  const fallAsleep = () => {
    const g = gameRef.current;
    if (!g) return;
    g.state.stage = 'sleep';
    setChoresVisible(false);
    displaySubtitle('The flat is locked and dark. You pull the blanket over your shoulders...');

    setTimeout(() => {
      // Midnight Blackout
      g.state.isPowerOn = false;
      g.state.gameMinutes = 330; // 4:30 AM
      g.state.stage = 'night';
      g.state.round = 0;
      g.state.roundsTotal = 5;
      g.state.frontOpen = true; // Swung open!
      g.props.doorPivot.rotation.y = 1.4;
      g.camera.position.set(2.6, 1.55, 2.5);

      sound.playTerrorStinger();
      setObjectiveText('4:30 AM — SURVIVE THE 5 KNOCKS. HIDE IN THE CUPBOARD!');
      displaySubtitle('4:30 AM. A cold draft wakes you. The power is cut, and the front door has swung open into the black hallway.');
    }, 4000);
  };

  // Game Script Loop
  const updateGameScript = (dt: number, now: number) => {
    const g = gameRef.current;
    if (!g) return;

    // Microwave heating timer
    if (g.state.stage === 'heating') {
      g.state.heatTimer += dt;
      g.props.mwGlass.material.emissiveIntensity = 1.6;
      g.lights.mwLight.intensity = 2.5;
      if (g.state.heatTimer >= 14) {
        g.state.stage = 'collect';
        g.props.mwGlass.material.emissiveIntensity = 0;
        g.lights.mwLight.intensity = 0;
        sound.playMicrowaveBeep();
        setObjectiveText('Take the hot plate from the microwave');
        displaySubtitle('The microwave beeps three times. Dinner is ready.');
      }
    }

    // Time progression
    const MIN_SPEED = 2 / 25; // 25s = 2 min
    if (g.state.mode !== 'practice' && g.state.stage !== 'eating') {
      g.state.gameMinutes = Math.min(420, g.state.gameMinutes + dt * MIN_SPEED);
    }
    setClockText(formatClock(g.state.gameMinutes));

    // Flashlight battery depletion
    if (g.state.flashOn) {
      g.state.battery = Math.max(0, g.state.battery - dt * 1.5);
      setBatteryPercent(Math.round(g.state.battery));
      if (g.state.battery <= 0) {
        g.state.flashOn = false;
        setFlashlightOn(false);
      }
    }

    // Sanity / Nerve restoration or damage
    const inHallway = g.camera.position.z < -5.0;
    if (inHallway) {
      g.state.hallTimer += dt;
      if (g.state.hallTimer > 6) {
        g.state.nerve = Math.max(0, g.state.nerve - dt * 7.5);
        sound.playHeartbeat(g.state.nerve);
      }
    } else {
      g.state.hallTimer = Math.max(0, g.state.hallTimer - dt * 2);
      g.state.nerve = Math.min(100, g.state.nerve + dt * 4);
    }
    setNervePercent(Math.round(g.state.nerve));

    if (g.state.nerve <= 0) {
      triggerGameOver('Your nerve broke. The shadows in the hallway closed in.');
      return;
    }

    // Curfew Night Rounds (5 Knock encounters)
    if (g.state.stage === 'night') {
      if (g.state.hideTimer > 0) {
        g.state.hideTimer -= dt;
        setHideCountdown(Math.ceil(g.state.hideTimer));
        setHideCountdownLabel(g.state.hiding ? (g.state.latched ? 'HOLD THE LATCH!' : 'LATCH THE DOOR!') : 'GET IN THE CUPBOARD!');

        if (g.state.hideTimer <= 0) {
          if (!g.state.hiding) {
            triggerGameOver('You were caught in the open hallway. Rule 3: Hide in the closet when it calls.');
            return;
          }
          // Inside cupboard, now entity rattles
          g.state.stayHiddenTimer = 6;
          g.state.isSafeInCloset = true;
          g.state.triedClosetDoor = false;
        }
      } else if (g.state.isSafeInCloset) {
        g.state.stayHiddenTimer -= dt;
        setHideCountdown(Math.ceil(g.state.stayHiddenTimer));

        if (!g.state.triedClosetDoor && g.state.stayHiddenTimer <= 3.5) {
          g.state.triedClosetDoor = true;
          g.state.rattleAmount = 1.0;
          sound.playKnock(0.7);
          sound.playWhisper();
          if (!g.state.latched) {
            triggerGameOver('It forced the unlatched cupboard door open. Always latch from the inside. Rule 7.');
            return;
          }
          displaySubtitle('Long grey fingers tug at the gap. The metal latch holds fast against the wood.');
        }

        if (g.state.stayHiddenTimer <= 0) {
          g.state.isSafeInCloset = false;
          setHideCountdown(null);
          g.state.round++;
          if (g.state.round >= g.state.roundsTotal) {
            // Dawn arrival!
            g.state.stage = 'dawn';
            g.state.gameMinutes = 420; // 6:00 AM
            g.state.isPowerOn = true;
            sound.playDawnChime();
            setObjectiveText('6:00 AM — Mom is at the front door. Open it to survive!');
            displaySubtitle('6:00 AM. Streetlights click off. Real metal keys turn in the front lock. Mom is home.');
          } else {
            setObjectiveText(`Survive the curfew — ${g.state.roundsTotal - g.state.round} knocks remaining`);
            displaySubtitle('Footsteps drag away into the corridor. It stopped pretending for now.');
            setTimeout(() => {
              triggerNextKnockRound();
            }, 8000);
          }
        }
      } else if (g.state.round === 0 && g.state.hideTimer <= 0) {
        triggerNextKnockRound();
      }
    }
  };

  const triggerNextKnockRound = () => {
    const g = gameRef.current;
    if (!g || g.state.stage !== 'night') return;
    sound.playKnock(1.0);
    g.state.hideTimer = 6.5;
    const voiceLines = [
      'Three knocks. A delivery voice: "Package for Apartment 4B?" (HIDE IN CLOSET!)',
      'Three knocks. Mom\'s voice, but distorted: "Leo, sweetie, open the door..." (DO NOT OPEN!)',
      'Three knocks. Ada\'s voice from two weeks ago: "Leo, let me in please..." (HIDE!)',
      'Three knocks. Your own voice from the kitchen counter: "I am already inside." (HIDE!)',
      'Frantic heavy pounding on the wood. The lock rattles violently!'
    ];
    const msg = voiceLines[Math.min(g.state.round, voiceLines.length - 1)];
    displaySubtitle(msg, 5000);
  };

  // Entity Animation & Stalking
  const updateEntityAnimation = (dt: number, now: number) => {
    const g = gameRef.current;
    if (!g) return;

    const ent = g.entities;
    const t = now * 0.003;

    if (g.state.stage === 'night' && g.state.hideTimer > 0) {
      ent.entityGroup.visible = true;
      ent.entityEyes.intensity = 2.8;
      // Stalk towards closet
      ent.entityGroup.position.z = Math.min(-2.8, ent.entityGroup.position.z + dt * 2.2);
      ent.entityGroup.lookAt(g.camera.position.x, 1.8, g.camera.position.z);
    } else {
      ent.entityGroup.visible = false;
      ent.entityEyes.intensity = 0;
      ent.entityGroup.position.set(0, 0, -14);
    }

    // Limb walk cycle
    ent.legL.rotation.x = Math.sin(t * 4) * 0.5;
    ent.legR.rotation.x = -Math.sin(t * 4) * 0.5;
    ent.armL.rotation.x = -Math.sin(t * 4) * 0.35;
    ent.armR.rotation.x = Math.sin(t * 4) * 0.35;
  };

  // Props & Lights update
  const updatePropsAndLights = (dt: number, now: number) => {
    const g = gameRef.current;
    if (!g) return;

    // Fridge door swing
    const targetFridge = g.state.fridgeOpen ? -1.2 : 0;
    g.props.fridgeHinge.rotation.y += (targetFridge - g.props.fridgeHinge.rotation.y) * dt * 5;

    // Closet doors
    const targetCloset = g.state.hiding ? 0 : 0.6;
    g.props.clHingeL.rotation.y += (targetCloset - g.props.clHingeL.rotation.y) * dt * 5;
    g.props.clHingeR.rotation.y += (-targetCloset - g.props.clHingeR.rotation.y) * dt * 5;

    // Closet door rattle when entity tests latch
    if (g.state.rattleAmount > 0) {
      g.state.rattleAmount = Math.max(0, g.state.rattleAmount - dt * 0.5);
      const rattleOffset = Math.sin(now * 0.04) * 0.08 * g.state.rattleAmount;
      g.props.clHingeL.rotation.y += rattleOffset;
      g.props.clHingeR.rotation.y -= rattleOffset;
    }

    // Lights
    if (g.state.isPowerOn) {
      g.lights.bulb.intensity = 14 + Math.sin(now * 0.01) * 0.8;
      g.lights.hallLight.intensity = g.state.hallLightOn ? 22 : 0;
      g.lights.hallGlow.intensity = 2.2;
    } else {
      g.lights.bulb.intensity = 0;
      g.lights.hallLight.intensity = 0;
      g.lights.hallGlow.intensity = 0.2;
    }

    // Flashlight beam
    g.lights.flashlight.intensity = g.state.flashOn ? (g.state.battery < 20 ? 35 + Math.random() * 30 : 85) : 0;

    // TV static animation
    if (g.state.tvOn && g.state.isPowerOn) {
      const img = g.props.tvCtx.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const val = Math.random() * 255;
        img.data[i] = val * 0.8;
        img.data[i + 1] = val * 0.95;
        img.data[i + 2] = val;
        img.data[i + 3] = 255;
      }
      g.props.tvCtx.putImageData(img, 0, 0);
      (g.materials.screen as THREE.MeshStandardMaterial).map!.needsUpdate = true;
      (g.materials.screen as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
      g.lights.tvLight.intensity = 6 + Math.random() * 3;
    } else {
      (g.materials.screen as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      g.lights.tvLight.intensity = 0;
    }

    // Wall clock hands
    const tm = 23 * 60 + g.state.gameMinutes;
    g.props.wallClockM.rotation.z = -((tm % 60) / 60) * Math.PI * 2;
    g.props.wallClockH.rotation.z = -((tm % 720) / 720) * Math.PI * 2;
  };

  // Start Game Mode
  const startGame = (chosenMode: 'story' | 'survival' | 'practice') => {
    sound.init();
    sound.playSwitch();
    setSelectedSubMode(chosenMode);
    setMode(chosenMode);

    const g = gameRef.current;
    if (g) {
      g.state.mode = chosenMode;
      g.state.gameMinutes = 0;
      g.state.battery = 100;
      g.state.nerve = 100;
      g.state.flashOn = false;
      g.state.isPowerOn = true;
      g.state.stage = chosenMode === 'practice' ? 'intro' : 'intro';
      g.camera.position.set(0, 1.55, 3.8);
      g.pitch = 0;
      g.yaw = 0;
      g.camera.rotation.set(0, 0, 0, 'YXZ');
      g.justLockedTime = performance.now();
    }

    setIsPaused(false);

    if (!isMobileDevice) {
      gameRef.current?.controls.lock();
    }

    if (chosenMode === 'story') {
      setObjectiveText('Chapter 0: Read the 5 rules taped to the fridge');
      displaySubtitle('11:00 PM. Mom leaves for the packing plant. The deadbolt clicks. Read the rules on the fridge.', 5000);
    } else if (chosenMode === 'survival') {
      setObjectiveText('Survive until 6:00 AM. Follow the Five Rules strictly.');
      displaySubtitle('Survival Mode. Seven hours until sunrise. Do not let it enter.', 4500);
    } else {
      setObjectiveText('Practice Mode: Explore apartment 4B. The clock is frozen.');
      displaySubtitle('Practice Mode. No entity will stalk you. Test your graphics and controls.', 4500);
    }
  };

  const triggerGameOver = (reason: string) => {
    sound.playTerrorStinger();
    setDeathReason(reason);
    setMode('dead');
    if (gameRef.current) {
      gameRef.current.state.mode = 'dead';
      gameRef.current.controls.unlock();
    }
  };

  const triggerSecretEnding = (endingKey: string) => {
    const ending = SECRET_ENDINGS[endingKey];
    if (!ending) return;
    sound.playDawnChime();
    setUnlockedEnding(ending);
    setMode('won');
    if (gameRef.current) {
      gameRef.current.state.mode = 'won';
      gameRef.current.controls.unlock();
    }
  };

  const completeNightWin = () => {
    sound.playDawnChime();
    setMode('won');
    if (gameRef.current) {
      gameRef.current.state.mode = 'won';
      gameRef.current.controls.unlock();
    }
  };

  // Change Graphic Preset
  const applyGraphicPreset = (preset: GraphicPreset) => {
    setGraphicPreset(preset);
    const g = gameRef.current;
    if (!g) return;

    const r = g.renderer;
    if (preset === 'ultra') {
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      if (g.props.dustSystem) g.props.dustSystem.visible = true;
    } else if (preset === 'high') {
      r.setPixelRatio(1.5);
      r.shadowMap.enabled = true;
      if (g.props.dustSystem) g.props.dustSystem.visible = true;
    } else if (preset === 'medium') {
      r.setPixelRatio(1.0);
      r.shadowMap.enabled = false;
      if (g.props.dustSystem) g.props.dustSystem.visible = false;
    } else if (preset === 'retro') {
      r.setPixelRatio(0.4); // Pixelated retro PS1 look
      r.shadowMap.enabled = false;
      if (g.props.dustSystem) g.props.dustSystem.visible = false;
    }
  };

  return (
    <div id="game-root" className={`relative w-full h-full select-none bg-black text-stone-200 overflow-hidden font-mono ${graphicPreset === 'retro' ? 'retro-pixelated' : ''}`}>
      {/* Three.js Canvas Container */}
      <div
        id="three-viewport"
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={() => {
          if (!isMobileDevice && (mode === 'story' || mode === 'survival' || mode === 'practice') && !activeDocument) {
            resumeGame();
          }
        }}
      />

      {/* Cinematic Film Grain & Vignette */}
      <div
        id="film-overlay"
        className="pointer-events-none absolute inset-0 z-10 opacity-35"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)'
        }}
      />

      {/* Terror / Sanity Vignette Pulsing */}
      <div
        id="terror-vignette"
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-700"
        style={{
          opacity: Math.max(0, (50 - nervePercent) / 50 * 0.85),
          background: 'radial-gradient(ellipse at center, rgba(120, 10, 10, 0) 30%, rgba(140, 15, 15, 0.75) 100%)'
        }}
      />

      {/* Cupboard Peep Hole Effect when hiding */}
      {isHidingInCloset && (
        <div
          id="closet-peep-overlay"
          className="pointer-events-none absolute inset-0 z-25 bg-black/60 flex items-center justify-center"
          style={{
            background: 'linear-gradient(90deg, #000 0%, #000 42%, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0.1) 52%, #000 58%, #000 100%)'
          }}
        >
          <div className="absolute top-10 px-4 py-2 bg-black/80 border border-stone-700 text-amber-300 text-sm tracking-widest uppercase">
            Hiding in Cupboard • {isLatched ? 'LATCH SECURED' : 'UNLATCHED (DANGER)'}
          </div>
        </div>
      )}

      {/* Center Crosshair (desktop) */}
      {(mode === 'story' || mode === 'survival' || mode === 'practice') && !isMobileDevice && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 opacity-70">
          <div className="w-1.5 h-1.5 rounded-full bg-stone-300/80 ring-2 ring-stone-900/60" />
        </div>
      )}

      {/* In-Game HUD Overlays */}
      {(mode === 'story' || mode === 'survival' || mode === 'practice') && (
        <>
          {/* Top Center: Objective Banner */}
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 text-center">
            <div className="px-5 py-2 bg-stone-950/80 border border-stone-700/80 rounded-sm backdrop-blur-sm text-sm tracking-wide shadow-2xl">
              <span className="text-stone-400 font-bold mr-2">OBJECTIVE:</span>
              <span className="text-emerald-400 font-medium">{objectiveText}</span>
            </div>
          </div>

          {/* Top Right: Clock & Location */}
          <div className="pointer-events-none absolute top-4 right-5 z-30 text-right">
            <div className="text-2xl font-bold tracking-widest text-emerald-400 drop-shadow-md">{clockText}</div>
            <div className="text-xs text-stone-400 tracking-wider">APARTMENT 4B • KESSLER ROW</div>
          </div>

          {/* Top Left: Flashlight Battery & Nerve Bar */}
          <div className="pointer-events-none absolute top-4 left-5 z-30 flex flex-col gap-2.5">
            {/* Battery */}
            <div className="flex items-center gap-2.5 bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-sm">
              <span className="text-xs font-semibold text-stone-300">BATTERY</span>
              <div className="w-24 h-2 bg-stone-900 border border-stone-700 rounded-xs overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${batteryPercent > 20 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`}
                  style={{ width: `${batteryPercent}%` }}
                />
              </div>
              <span className="text-xs text-stone-400">{flashlightOn ? `${batteryPercent}%` : 'OFF'}</span>
            </div>

            {/* Nerve / Sanity */}
            <div className="flex items-center gap-2.5 bg-stone-950/80 border border-stone-800 px-3 py-1.5 rounded-sm">
              <span className="text-xs font-semibold text-stone-300">NERVE</span>
              <div className="w-24 h-2 bg-stone-900 border border-stone-700 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${nervePercent}%` }}
                />
              </div>
              <span className="text-xs text-stone-400">{nervePercent}%</span>
            </div>
          </div>

          {/* Grandma's Midnight Chores Checklist (Left Side) */}
          {choresVisible && (
            <div className="pointer-events-none absolute left-5 top-28 z-30 bg-stone-950/85 border-l-2 border-stone-600 px-4 py-3 rounded-r text-xs space-y-2 backdrop-blur-sm">
              <div className="font-bold text-stone-400 tracking-wider">BEFORE YOU SLEEP</div>
              <div className={choresState.plate ? 'line-through text-stone-500' : 'text-stone-300'}>
                {choresState.plate ? '✓' : '□'} Rinse dinner plate in sink
              </div>
              <div className={choresState.curtain ? 'line-through text-stone-500' : 'text-stone-300'}>
                {choresState.curtain ? '✓' : '□'} Close window curtain
              </div>
              <div className={choresState.tv ? 'line-through text-stone-500' : 'text-stone-300'}>
                {choresState.tv ? '✓' : '□'} Switch TV off
              </div>
              <div className={choresState.hall ? 'line-through text-stone-500' : 'text-stone-300'}>
                {choresState.hall ? '✓' : '□'} Turn hallway switch off
              </div>
            </div>
          )}

          {/* Carrying Plate Visual indicator */}
          {isHoldingPlate && (
            <div className="pointer-events-none absolute bottom-12 right-12 z-30 flex items-center gap-2 bg-amber-950/80 border border-amber-700 px-4 py-2 rounded-sm text-xs text-amber-200">
              <div className="w-4 h-4 rounded-full border-2 border-amber-300 animate-spin" />
              Holding Grandma's Dinner Plate
            </div>
          )}

          {/* Interactive Action Prompt in Center */}
          {promptText && (
            <div className="pointer-events-none absolute left-1/2 top-3/5 -translate-x-1/2 -translate-y-1/2 z-30 px-5 py-2.5 bg-stone-950/90 border border-stone-600 rounded text-stone-100 text-sm tracking-wider font-semibold shadow-2xl backdrop-blur-md">
              {promptText}
            </div>
          )}

          {/* Subtitles Banner */}
          {subtitleText && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-30 max-w-2xl px-6 py-3 bg-black/85 border border-stone-800 rounded-sm text-center text-sm md:text-base leading-relaxed text-stone-100 tracking-wide drop-shadow-xl backdrop-blur-sm">
              {subtitleText}
            </div>
          )}

          {/* Big Hide Countdown */}
          {hideCountdown !== null && (
            <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 z-40 text-center">
              <div className="text-6xl md:text-7xl font-extrabold text-red-500 tracking-widest drop-shadow-[0_0_25px_rgba(220,38,38,0.8)]">
                {hideCountdown}
              </div>
              <div className="text-sm font-bold tracking-widest text-amber-200 mt-2 bg-stone-950/90 px-4 py-1.5 border border-red-800 rounded-sm">
                {hideCountdownLabel}
              </div>
            </div>
          )}

          {/* Bottom Desktop Control Help */}
          {!isMobileDevice && (
            <div className="pointer-events-none absolute bottom-4 left-5 z-30 text-[11px] text-stone-400 space-x-3">
              <span>[W,A,S,D] Move</span>
              <span>[Shift] Sprint</span>
              <span>[F] Flashlight</span>
              <span>[E] Interact</span>
              <span>[Q] Latch</span>
            </div>
          )}

          {/* Mobile Touch Controls Overlay */}
          {isMobileDevice && (
            <div className="absolute inset-0 z-30 pointer-events-auto">
              {/* Virtual Movement Joystick on Left */}
              <div
                className="absolute left-6 bottom-8 w-32 h-32 rounded-full border-2 border-stone-500/40 bg-stone-950/30 flex items-center justify-center touch-none"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  if (gameRef.current) {
                    gameRef.current.touch.moveX = (touch.clientX - cx) / (rect.width / 2);
                    gameRef.current.touch.moveY = (touch.clientY - cy) / (rect.height / 2);
                  }
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  if (gameRef.current) {
                    gameRef.current.touch.moveX = (touch.clientX - cx) / (rect.width / 2);
                    gameRef.current.touch.moveY = (touch.clientY - cy) / (rect.height / 2);
                  }
                }}
                onTouchEnd={() => {
                  if (gameRef.current) {
                    gameRef.current.touch.moveX = 0;
                    gameRef.current.touch.moveY = 0;
                  }
                }}
              >
                <div className="w-12 h-12 rounded-full bg-stone-300/40 border border-white/50" />
              </div>

              {/* Touch Look Area on Right */}
              <div
                className="absolute right-0 top-0 w-3/5 h-full touch-none"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (gameRef.current) {
                    gameRef.current.touch.lookId = touch.identifier;
                    gameRef.current.touch.lastLookX = touch.clientX;
                    gameRef.current.touch.lastLookY = touch.clientY;
                  }
                }}
                onTouchMove={(e) => {
                  if (!gameRef.current) return;
                  for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === gameRef.current.touch.lookId) {
                      const dx = touch.clientX - gameRef.current.touch.lastLookX;
                      const dy = touch.clientY - gameRef.current.touch.lastLookY;
                      gameRef.current.touch.lastLookX = touch.clientX;
                      gameRef.current.touch.lastLookY = touch.clientY;
                      const cam = gameRef.current.camera;
                      const multX = invertXRef.current ? -1 : 1;
                      const multY = invertYRef.current ? 1 : -1;
                      cam.rotation.y -= dx * 0.005 * sensitivity * multX;
                      cam.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cam.rotation.x + dy * 0.005 * sensitivity * multY));
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (gameRef.current) {
                    gameRef.current.touch.lookId = null;
                  }
                }}
              />

              {/* Action Buttons Right Side */}
              <div className="absolute right-6 bottom-8 flex flex-col gap-3 z-40">
                <button
                  type="button"
                  className="w-16 h-16 rounded-full bg-stone-900/80 border-2 border-stone-500 active:bg-red-800 text-stone-100 font-bold text-xs flex items-center justify-center shadow-lg"
                  onClick={() => performInteraction()}
                >
                  USE
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="w-14 h-14 rounded-full bg-stone-900/80 border border-stone-600 active:bg-amber-800 text-stone-200 font-bold text-xs flex items-center justify-center shadow"
                    onClick={() => toggleFlashlight()}
                  >
                    LIGHT
                  </button>
                  <button
                    type="button"
                    className="w-14 h-14 rounded-full bg-stone-900/80 border border-stone-600 active:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center shadow"
                    onClick={() => toggleLatch()}
                  >
                    LATCH
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main Menu Screen */}
      {mode === 'menu' && (
        <div id="main-menu" className="absolute inset-0 z-50 flex flex-col justify-center px-8 md:px-20 bg-gradient-to-r from-black/95 via-black/75 to-black/20">
          <div className="max-w-xl space-y-6">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-stone-400 font-semibold mb-1">
                Apartment 4B • Kessler Row • Psychological Horror
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-widest text-stone-100 drop-shadow-[4px_4px_0_#5a1212]">
                THE MIDNIGHT<br />
                <span className="text-2xl md:text-4xl tracking-[0.3em] text-stone-400">CURFEW</span>
              </h1>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                Mom is on the 11:00 PM to 6:00 AM shift. Ada disappeared two weeks ago. Follow Grandma's five rules to survive.
              </p>
            </div>

            {/* Menu Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="group flex items-center gap-3 px-5 py-3 text-left font-bold tracking-wider text-base border-l-4 border-red-700 bg-stone-900/70 hover:bg-red-950/50 hover:text-white transition-all shadow-md"
                onClick={() => startGame('story')}
              >
                <Play className="w-4 h-4 text-red-500 group-hover:scale-125 transition-transform" />
                <span>STORY MODE</span>
                <span className="text-xs text-stone-400 font-normal ml-auto">Prologue to Dawn (Chapters 0-5)</span>
              </button>

              <button
                type="button"
                className="group flex items-center gap-3 px-5 py-3 text-left font-bold tracking-wider text-base border-l-4 border-stone-600 bg-stone-900/50 hover:bg-stone-800/70 hover:text-white transition-all"
                onClick={() => startGame('survival')}
              >
                <Shield className="w-4 h-4 text-amber-500 group-hover:scale-125 transition-transform" />
                <span>SURVIVAL MODE</span>
                <span className="text-xs text-stone-400 font-normal ml-auto">Classic Curfew Night (11 PM - 6 AM)</span>
              </button>

              <button
                type="button"
                className="group flex items-center gap-3 px-5 py-3 text-left font-bold tracking-wider text-base border-l-4 border-stone-700 bg-stone-900/40 hover:bg-stone-800/60 hover:text-white transition-all"
                onClick={() => startGame('practice')}
              >
                <Compass className="w-4 h-4 text-emerald-500 group-hover:scale-125 transition-transform" />
                <span>PRACTICE MODE</span>
                <span className="text-xs text-stone-400 font-normal ml-auto">Safe exploration • Frozen clock</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/50 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300"
                  onClick={() => setShowRulesJournal(true)}
                >
                  <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                  THE FIVE RULES
                </button>

                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/50 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Sliders className="w-3.5 h-3.5 text-stone-400" />
                  GRAPHICS & SOUND
                </button>

                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/50 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300"
                  onClick={() => setShowHowToPlay(true)}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                  HOW TO PLAY
                </button>

                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/50 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300"
                  onClick={() => setShowStorySelectModal(true)}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
                  CHAPTER SELECT
                </button>
              </div>
            </div>

            <div className="text-xs text-stone-400 pt-3 border-t border-stone-800/80">
              High-Fidelity Build • Three.js WebGL Engine • Procedural Audio
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {mode === 'dead' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-black/95">
          <h2 className="text-4xl md:text-6xl font-black tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">
            IT FOUND YOU
          </h2>
          <p className="max-w-lg mt-4 text-stone-300 text-sm md:text-base leading-relaxed">
            {deathReason || 'You broke one of the midnight rules. Ada made the same mistake.'}
          </p>
          <button
            type="button"
            className="mt-8 px-6 py-3 border border-red-700 bg-red-950/60 hover:bg-red-900 text-stone-100 font-bold tracking-widest text-sm uppercase rounded-xs transition-colors"
            onClick={() => {
              setMode('menu');
              gameRef.current?.controls.unlock();
            }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Victory / Dawn Screen */}
      {mode === 'won' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-black/95">
          <h2 className="text-4xl md:text-6xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.7)]">
            {unlockedEnding ? unlockedEnding.title : '6:00 AM — DAWN'}
          </h2>
          <div className="max-w-xl mt-4 text-stone-300 text-sm md:text-base leading-relaxed space-y-3">
            {unlockedEnding ? (
              <p>{unlockedEnding.description}</p>
            ) : (
              <>
                <p>Real keys turn in the front lock. Mom smells like cardboard and damp autumn air.</p>
                <p className="text-stone-400 text-xs">You survived Night 1 of the Curfew without breaking Grandma's rules.</p>
              </>
            )}
          </div>
          <button
            type="button"
            className="mt-8 px-6 py-3 border border-emerald-700 bg-emerald-950/60 hover:bg-emerald-900 text-stone-100 font-bold tracking-widest text-sm uppercase rounded-xs transition-colors"
            onClick={() => {
              setUnlockedEnding(null);
              setMode('menu');
              gameRef.current?.controls.unlock();
            }}
          >
            RETURN TO TITLE
          </button>
        </div>
      )}

      {/* Note / Document Reading Modal */}
      {activeDocument && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-stone-900 border border-stone-700 p-6 md:p-8 rounded-sm shadow-2xl space-y-4">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-100"
              onClick={() => closeActiveDocument()}
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-xs uppercase tracking-widest text-red-400 font-bold">{activeDocument.subtitle}</div>
              <h3 className="text-2xl font-bold tracking-wider text-stone-100 mt-1">{activeDocument.title}</h3>
            </div>

            <div className="space-y-3 pt-2 text-stone-300 text-sm leading-relaxed border-t border-stone-800">
              {activeDocument.content.map((paragraph, idx) => (
                <p key={idx} className="border-l-2 border-stone-700 pl-3">{paragraph}</p>
              ))}
            </div>

            {activeDocument.footer && (
              <div className="pt-3 text-xs italic text-stone-400 border-t border-stone-800">
                {activeDocument.footer}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                type="button"
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-xs font-bold tracking-widest text-stone-200 uppercase"
                onClick={() => closeActiveDocument()}
              >
                CLOSE [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graphics & Sound Settings Modal */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-stone-950 border border-stone-800 p-6 rounded-sm shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-lg font-bold tracking-wider text-stone-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                SETTINGS & GRAPHICS
              </h3>
              <button
                type="button"
                className="p-1 text-stone-400 hover:text-stone-100"
                onClick={() => setShowSettingsModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Graphics Preset Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Graphics Fidelity
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['ultra', 'high', 'medium', 'retro'] as GraphicPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`px-3 py-2 text-xs font-bold tracking-wider uppercase border transition-all ${
                      graphicPreset === preset
                        ? 'border-red-600 bg-red-950/60 text-white'
                        : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700'
                    }`}
                    onClick={() => applyGraphicPreset(preset)}
                  >
                    {preset === 'ultra' && 'Ultra (HD Shadows)'}
                    {preset === 'high' && 'High (PCF Shadows)'}
                    {preset === 'medium' && 'Performance'}
                    {preset === 'retro' && 'Retro PS1 (Pixelated)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Volume */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Master Sound Volume
                </span>
                <span>{Math.round(volume * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  sound.setVolume(val);
                }}
                className="w-full accent-red-600"
              />
              <button
                type="button"
                className="mt-1 text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5"
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  sound.setMute(nextMuted);
                }}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isMuted ? 'Unmute Audio' : 'Mute All Audio'}
              </button>
            </div>

            {/* Sensitivity & Reverse Look */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                  <span>Look Sensitivity</span>
                  <span>{sensitivity.toFixed(1)}x</span>
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Invert / Reverse Look Axes */}
              <div className="space-y-1.5 pt-1 border-t border-stone-800">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                  <span>Invert / Reverse Look Controls</span>
                  <span className="text-[10px] text-stone-400 font-normal">Custom Axis Direction</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`px-3 py-2 text-xs font-bold tracking-wider uppercase border transition-all ${
                      invertY
                        ? 'border-amber-600 bg-amber-950/60 text-amber-200'
                        : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700'
                    }`}
                    onClick={() => setInvertY((prev) => !prev)}
                  >
                    Vertical (Y): {invertY ? 'REVERSED' : 'NORMAL'}
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-xs font-bold tracking-wider uppercase border transition-all ${
                      invertX
                        ? 'border-amber-600 bg-amber-950/60 text-amber-200'
                        : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700'
                    }`}
                    onClick={() => setInvertX((prev) => !prev)}
                  >
                    Horizontal (X): {invertX ? 'REVERSED' : 'NORMAL'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold tracking-widest text-stone-200 uppercase"
                onClick={() => setShowSettingsModal(false)}
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Journal Modal */}
      {showRulesJournal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-stone-950 border border-stone-800 p-6 md:p-8 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-red-500 font-bold">Grandma's Curfew Rules</div>
                <h3 className="text-2xl font-bold tracking-wider text-stone-100">THE FIVE MIDNIGHT RULES</h3>
              </div>
              <button
                type="button"
                className="p-1 text-stone-400 hover:text-stone-100"
                onClick={() => setShowRulesJournal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-sm leading-relaxed text-stone-300">
              {LORE_DOCUMENTS.rules.content.map((rule, idx) => (
                <div key={idx} className="flex gap-3 items-start border-b border-stone-900 pb-2">
                  <span className="text-red-500 font-bold">{idx + 1}.</span>
                  <p>{rule.replace(/^[0-9]\.\s*/, '')}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold tracking-widest text-stone-200 uppercase"
                onClick={() => setShowRulesJournal(false)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-stone-950 border border-stone-800 p-6 md:p-8 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-xl font-bold tracking-wider text-stone-100">HOW TO SURVIVE APARTMENT 4B</h3>
              <button
                type="button"
                className="p-1 text-stone-400 hover:text-stone-100"
                onClick={() => setShowHowToPlay(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs md:text-sm text-stone-300 leading-relaxed">
              <p>
                <strong className="text-white">1. Movement & Controls:</strong> On desktop, move with [W, A, S, D], sprint with [Shift], and look with your mouse. On touch devices, use the virtual left stick to walk and drag on the right screen half to look.
              </p>
              <p>
                <strong className="text-white">2. Interacting:</strong> Press [E] (or tap USE) when approaching fixtures (fridge, microwave, sink, TV, doors, cupboard).
              </p>
              <p>
                <strong className="text-white">3. Flashlight:</strong> Press [F] to toggle your flashlight. Conserve battery; when the battery dies, you are in pitch blackness.
              </p>
              <p>
                <strong className="text-white">4. The Cupboard:</strong> The bedroom cupboard is your only sanctuary. When you hear knocks or calls, climb inside and press [Q] to latch the doors from the inside.
              </p>
              <p>
                <strong className="text-white">5. Curfew Clock:</strong> Survive until exactly 6:00 AM. Mom will unlock the door with her authentic latch key.
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold tracking-widest text-stone-200 uppercase"
                onClick={() => setShowHowToPlay(false)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Chapter Selector Modal */}
      {showStorySelectModal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-stone-950 border border-stone-800 p-6 md:p-8 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-xl font-bold tracking-wider text-stone-100">STORY CHAPTERS</h3>
              <button
                type="button"
                className="p-1 text-stone-400 hover:text-stone-100"
                onClick={() => setShowStorySelectModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {STORY_CHAPTERS.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3.5 border border-stone-800 bg-stone-900/40 hover:bg-stone-900/80 transition-colors flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    setShowStorySelectModal(false);
                    startGame('story');
                  }}
                >
                  <div>
                    <div className="text-xs font-bold text-red-400 tracking-wider">{ch.timeString} • {ch.title}</div>
                    <div className="text-sm text-stone-200 font-medium mt-0.5">{ch.subtitle}</div>
                    <div className="text-xs text-stone-400 mt-1">{ch.loreClue}</div>
                  </div>
                  <Play className="w-4 h-4 text-stone-500 hover:text-stone-100 flex-shrink-0 ml-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPaused && (mode === 'story' || mode === 'survival' || mode === 'practice') && !activeDocument && !showSettingsModal && !showHowToPlay && !showRulesJournal && !showStorySelectModal && (
        <div
          id="pause-menu"
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resumeGame();
            }
          }}
        >
          <div className="relative w-full max-w-md bg-stone-950/95 border border-stone-800 p-6 md:p-8 rounded-sm shadow-2xl space-y-5">
            <div className="border-b border-stone-800 pb-3 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold">APARTMENT 4B • PAUSED</div>
              <h2 className="text-2xl md:text-3xl font-black tracking-widest text-stone-100 mt-1">GAME PAUSED</h2>
              <p className="text-xs text-stone-400 mt-1">Press ESC or click Resume to continue playing</p>
            </div>

            {/* Quick Resume Button */}
            <div className="space-y-3">
              <button
                type="button"
                id="resume-btn"
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-red-950/70 hover:bg-red-900 border-2 border-red-700 text-stone-100 font-black tracking-widest text-sm uppercase rounded-xs transition-all shadow-lg hover:shadow-red-900/30 cursor-pointer"
                onClick={() => resumeGame()}
              >
                <Play className="w-4 h-4 text-red-400 fill-current" />
                RESUME GAME [ESC]
              </button>

              {/* Reverse / Invert Controls Section */}
              <div className="bg-stone-900/60 border border-stone-800/80 p-3 rounded-xs space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
                  <span>Mouse Look & Reverse Controls</span>
                  <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`px-3 py-2 text-xs font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
                      invertY
                        ? 'border-amber-600 bg-amber-950/60 text-amber-200'
                        : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:text-stone-200'
                    }`}
                    onClick={() => setInvertY((prev) => !prev)}
                  >
                    Vertical (Y): {invertY ? 'REVERSED' : 'NORMAL'}
                  </button>

                  <button
                    type="button"
                    className={`px-3 py-2 text-xs font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
                      invertX
                        ? 'border-amber-600 bg-amber-950/60 text-amber-200'
                        : 'border-stone-800 bg-stone-900/80 text-stone-400 hover:text-stone-200'
                    }`}
                    onClick={() => setInvertX((prev) => !prev)}
                  >
                    Horizontal (X): {invertX ? 'REVERSED' : 'NORMAL'}
                  </button>
                </div>

                {/* Sensitivity Slider in Pause Menu */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                    <span>Look Sensitivity</span>
                    <span className="text-stone-200 font-bold">{sensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-full accent-red-600 h-1.5"
                  />
                </div>
              </div>

              {/* Secondary Navigation Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  onClick={() => setShowHowToPlay(true)}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                  CONTROLS
                </button>

                <button
                  type="button"
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Sliders className="w-3.5 h-3.5 text-stone-400" />
                  SETTINGS
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-stone-400 hover:text-stone-200 cursor-pointer"
                  onClick={() => {
                    setIsPaused(false);
                    startGame(selectedSubMode);
                  }}
                >
                  RESTART
                </button>

                <button
                  type="button"
                  className="flex-1 px-4 py-2.5 bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-xs font-semibold tracking-wider text-red-400 hover:text-red-300 cursor-pointer"
                  onClick={() => {
                    setIsPaused(false);
                    setMode('menu');
                    gameRef.current?.controls.unlock();
                  }}
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
