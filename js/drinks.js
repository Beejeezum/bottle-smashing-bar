// Glassware is turned on a lathe: each vessel is a 2D profile revolved around Y.
import * as THREE from 'three';

const V2 = a => a.map(p => new THREE.Vector2(p[0], p[1]));

// pts: [radius, height] outline.  liq: [rBottom, rTop, y0, y1] of the liquid column.
export const VESSELS = {
  longneck: { pts: [[0, 0], [.031, 0], [.033, .008], [.033, .115], [.03, .14], [.016, .175], [.0135, .225], [.0155, .229], [.0155, .24], [.011, .24]], liq: [.029, .029, .006, .13] },
  jug: { pts: [[0, 0], [.05, 0], [.053, .01], [.053, .17], [.045, .2], [.02, .235], [.018, .285], [.022, .29], [.022, .3], [.015, .3]], liq: [.048, .048, .008, .18] },
  pint: { pts: [[0, 0], [.031, 0], [.033, .004], [.043, .16], [.04, .16], [.0305, .012], [0, .012]], liq: [.03, .039, .013, .15] },
  rocks: { pts: [[0, 0], [.04, 0], [.042, .004], [.043, .09], [.04, .09], [.038, .018], [0, .018]], liq: [.037, .039, .019, .062] },
  shot: { pts: [[0, 0], [.019, 0], [.02, .003], [.026, .062], [.023, .062], [.017, .016], [0, .016]], liq: [.017, .0215, .017, .056] },
  martini: { pts: [[0, 0], [.036, 0], [.034, .005], [.005, .011], [.0045, .09], [.063, .168], [.061, .17], [.003, .097], [0, .097]], liq: [.005, .05, .098, .156] },
  wine: { pts: [[0, 0], [.034, 0], [.033, .004], [.005, .01], [.0045, .085], [.03, .1], [.042, .13], [.04, .165], [.034, .19], [.032, .19], [.038, .164], [.04, .13], [.028, .102], [0, .092]], liq: [.027, .038, .1, .148] },
};

export const DRINKS = [
  { id: 'lager', key: '1', name: 'Cheap Lager', desc: 'Mostly water. Mostly.', vessel: 'longneck', glass: 0x6b3a12, liquid: 0xe8b22a, strength: 1.0, time: 1.5, price: 3 },
  { id: 'ipa', key: '2', name: 'Hop Hammer IPA', desc: 'Tastes like a pine tree lost a fight.', vessel: 'longneck', glass: 0x1f6b3a, liquid: 0xd98a1c, strength: 1.5, time: 1.6, price: 7 },
  { id: 'stout', key: '3', name: 'Pint of Midnight Stout', desc: 'A meal, technically.', vessel: 'pint', liquid: 0x2a1508, strength: 1.8, time: 2.0, price: 6 },
  { id: 'wine', key: '4', name: 'House Red', desc: 'The house is not proud of it.', vessel: 'wine', liquid: 0x8a1228, strength: 1.6, time: 1.4, price: 8 },
  { id: 'martini', key: '5', name: 'Dirty Martini', desc: 'Filthy, even.', vessel: 'martini', liquid: 0xdfe8c8, strength: 2.2, time: 1.1, price: 11 },
  { id: 'tequila', key: '6', name: 'Tequila Shot', desc: 'Fast in. Fast out.', vessel: 'shot', liquid: 0xf1e6a0, strength: 2.0, time: 0.45, price: 5 },
  { id: 'whiskey', key: '7', name: 'Whiskey, Neat', desc: 'For serious throwing.', vessel: 'rocks', liquid: 0xc46a1c, strength: 2.6, time: 1.0, price: 9 },
  { id: 'special', key: '8', name: 'Bottom Shelf Special', desc: 'It glows. Do not ask why.', vessel: 'jug', glass: 0x223a8a, liquid: 0x39ff88, glow: 2.2, strength: 4.5, time: 2.4, price: 4 },
  { id: 'water', key: '9', name: 'Glass of Water', desc: 'Sobers you up. Coward.', vessel: 'pint', liquid: 0xbfe6ff, strength: -2.5, time: 1.3, price: 0 },
  { id: 'bucket', key: '0', name: "Bucket o' Lagers ×5", desc: 'For the efficient.', vessel: 'longneck', glass: 0x6b3a12, liquid: 0xe8b22a, strength: 1.0, time: 1.5, price: 12, bundle: 5 },
];

const geoCache = {}, matCache = {}, liqGeo = {};

export function vesselGeo(v) {
  return geoCache[v] ??= new THREE.LatheGeometry(V2(VESSELS[v].pts), 22);
}

export function glassMat(color = 0xdfefff, opacity = 0.3) {
  const k = color + '_' + opacity;
  return matCache[k] ??= new THREE.MeshStandardMaterial({
    color, transparent: true, opacity, roughness: 0.05, metalness: 0,
    envMapIntensity: 3, side: THREE.DoubleSide, depthWrite: false,
  });
}

export function makeVessel(drink, fill = 1) {
  const V = VESSELS[drink.vessel];
  const g = new THREE.Group();
  const [rb, rt, y0, y1] = V.liq;
  const lg = liqGeo[drink.vessel] ??= new THREE.CylinderGeometry(rt, rb, 1, 18).translate(0, 0.5, 0);
  const liq = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({
    color: drink.liquid, roughness: 0.25, emissive: drink.liquid, emissiveIntensity: drink.glow ?? 0.1,
  }));
  liq.position.y = y0;
  const glass = new THREE.Mesh(vesselGeo(drink.vessel), glassMat(drink.glass ?? 0xdfefff, drink.glass ? 0.8 : 0.3));
  glass.renderOrder = 2;
  g.add(liq, glass);
  const setFill = f => { liq.visible = f > 0.01; liq.scale.y = Math.max(0.001, (y1 - y0) * f); };
  setFill(fill);
  g.userData = { drink, setFill };
  return g;
}
