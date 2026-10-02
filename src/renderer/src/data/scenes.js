// Every hazard-spotting scene the kiosk can run. The admin dashboard picks one (see
// AdminScreen "Active Game" / db:getGameSettings); GameScreen and sceneMap.js are otherwise
// identical for every scene — only the assets and hazard list below change.
import warehouseSceneUrl from '../assets/scene.webp'
import warehouseLabelsUrl from '../assets/scene-labels.png'
import warehouseObjectList from './scene-objects.json'
import {
  HAZARDS as warehouseHazards,
  hazardByNum as warehouseHazardByNum,
  hazardForKey as warehouseHazardForKey
} from './hazards'

import pharmaSceneUrl from '../assets/scenes/pharma/scene.webp'
import pharmaLabelsUrl from '../assets/scenes/pharma/scene-labels.png'
import pharmaObjectList from './scenes/pharma/scene-objects.json'
import {
  HAZARDS as pharmaHazards,
  hazardByNum as pharmaHazardByNum,
  hazardForKey as pharmaHazardForKey
} from './scenes/pharma/hazards'

import chemicalSceneUrl from '../assets/scenes/chemical/scene.webp'
import chemicalLabelsUrl from '../assets/scenes/chemical/scene-labels.png'
import chemicalObjectList from './scenes/chemical/scene-objects.json'
import {
  HAZARDS as chemicalHazards,
  hazardByNum as chemicalHazardByNum,
  hazardForKey as chemicalHazardForKey
} from './scenes/chemical/hazards'

import automotiveSceneUrl from '../assets/Automotive.svg'
import { VECTOR_OBJECTS as automotiveVectorObjects } from './scenes/automotive/vector-objects'
import {
  HAZARDS as automotiveHazards,
  hazardByNum as automotiveHazardByNum,
  hazardForKey as automotiveHazardForKey
} from './scenes/automotive/hazards'

import cementSceneUrl from '../assets/Cement-Industry.png'
import { VECTOR_OBJECTS as cementVectorObjects } from './scenes/cement/vector-objects'
import {
  HAZARDS as cementHazards,
  hazardByNum as cementHazardByNum,
  hazardForKey as cementHazardForKey
} from './scenes/cement/hazards'

const warehouseImages = import.meta.glob('../assets/objects/*.png', {
  eager: true,
  import: 'default'
})
const pharmaImages = import.meta.glob('../assets/scenes/pharma/objects/*.png', {
  eager: true,
  import: 'default'
})
const chemicalImages = import.meta.glob('../assets/scenes/chemical/objects/*.png', {
  eager: true,
  import: 'default'
})

export const SCENES = {
  warehouse: {
    id: 'warehouse',
    label: 'Warehouse & Refinery',
    sceneUrl: warehouseSceneUrl,
    labelsUrl: warehouseLabelsUrl,
    objectList: warehouseObjectList,
    imageFor: (key) => warehouseImages[`../assets/objects/${key}.png`],
    HAZARDS: warehouseHazards,
    hazardByNum: warehouseHazardByNum,
    hazardForKey: warehouseHazardForKey
  },
  pharma: {
    id: 'pharma',
    label: 'Pharma Industry',
    sceneUrl: pharmaSceneUrl,
    labelsUrl: pharmaLabelsUrl,
    objectList: pharmaObjectList,
    imageFor: (key) => pharmaImages[`../assets/scenes/pharma/objects/${key}.png`],
    HAZARDS: pharmaHazards,
    hazardByNum: pharmaHazardByNum,
    hazardForKey: pharmaHazardForKey
  },
  chemical: {
    id: 'chemical',
    label: 'Chemical Industry',
    sceneUrl: chemicalSceneUrl,
    labelsUrl: chemicalLabelsUrl,
    objectList: chemicalObjectList,
    imageFor: (key) => chemicalImages[`../assets/scenes/chemical/objects/${key}.png`],
    HAZARDS: chemicalHazards,
    hazardByNum: chemicalHazardByNum,
    hazardForKey: chemicalHazardForKey
  },
  automotive: {
    id: 'automotive',
    label: 'Automotive Industry',
    // vector scene: hazards are hand-traced polygons tinted with CSS/SVG at tap time, not
    // designer PNG cut-outs — see VECTOR_OBJECTS and GameScreen's vector-scene branch.
    kind: 'vector',
    sceneUrl: automotiveSceneUrl,
    imageWidth: 1448,
    imageHeight: 813,
    vectorObjects: automotiveVectorObjects,
    HAZARDS: automotiveHazards,
    hazardByNum: automotiveHazardByNum,
    hazardForKey: automotiveHazardForKey
  },
  cement: {
    id: 'cement',
    label: 'Cement Industry',
    // The source poster contains a header and PPE footer; cover-crop to the central scene.
    kind: 'vector',
    imageFit: 'cover',
    sceneUrl: cementSceneUrl,
    imageWidth: 1448,
    imageHeight: 822,
    vectorObjects: cementVectorObjects,
    HAZARDS: cementHazards,
    hazardByNum: cementHazardByNum,
    hazardForKey: cementHazardForKey
  }
}

export const DEFAULT_SCENE_ID = 'warehouse'
export const sceneFor = (id) => SCENES[id] || SCENES[DEFAULT_SCENE_ID]
