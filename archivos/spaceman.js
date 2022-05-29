"use strict";

import * as THREE from "../libs/three.js/three.module.js";
import { OBJLoader } from "../libs/three.js/loaders/OBJLoader.js";
import { MTLLoader } from "../libs/three.js/loaders/MTLLoader.js";
import {Game, Utils} from './common.js';

//General variables
let game_status = false;

// THREE JS RENDER VARIABLES
let renderer = null,
  scene = null,
  camera = null,
  earthGroup = null,
  asteroidsGroup = null,
  objEarth = null,
  objShip = null,
  objAsteroid = null,
  listAsteroid = [],
  aspectRatio = null,
  fieldOfView = null,
  nearPlane = null,
  farShip = null,
  shipBoxHelper = null,
  shipBox = null,
  asteroidBoxHelper = null,
  asteroidBox = null,
  lstBoxHelpers = [],
  shipGroup = [],
  currentTime = Date.now();

// Movement variables
var WIDTH,
  HEIGHT,
  mousePos = { x: 0, y: 0 };

// Lights variables
let spotLight = null,
  ambientLight = null,
  SHADOW_MAP_WIDTH = 1024,
  SHADOW_MAP_HEIGHT = 1024;

// Objects variables
let objModelEarth = { obj: "../assets/earth.obj", mtl: "../assets/earth.mtl" },
  objModelShip = {
    obj: "../assets/objects/Cartoon_Rocket/cartoon_rocket.obj",
    mtl: "../assets/objects/Cartoon_Rocket/cartoon_rocket.mtl",
  },
  objModelAsteroid = {
    obj: "../assets/objects/Asteroid/asteroid.obj",
    mtl: "../assets/objects/Asteroid/asteroid.mtl",
  };

//Score variables
let div_score = null,
  score = 0;

function main() {
  const canvas = document.getElementById("webglcanvas");
  div_score = document.getElementById("score");
  initPointerLock();

  createScene(canvas);
  createLights();
  createEarth();
  createShip();
  update();
}

//Function to init the lights
function createLights() {
  spotLight = new THREE.SpotLight(0xaaaaaa);
  spotLight.position.set(0, 10, 30);
  spotLight.target.position.set(0, 5, 0);
  scene.add(spotLight);

  spotLight.castShadow = true;

  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 200;
  spotLight.shadow.camera.fov = 45;

  spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
  spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

  ambientLight = new THREE.AmbientLight(0x444444, 0.8);
  scene.add(ambientLight);
}

//Function to create the earth
async function createEarth() {
  // Create a group to hold object earth
  earthGroup = new THREE.Object3D();
  earthGroup.position.set(0, -7, 20);
  objEarth = await loadObjMtl(
    objModelEarth,
    [0, 0, 0],
    [10, 10, 10],
    [0, 0, 0]
  );
  //Add earth to its group
  earthGroup.add(objEarth);

  //Add the groud to the scene
  scene.add(earthGroup);
}

// Function to create the ship
async function createShip() {
  shipGroup = new THREE.Object3D;

  shipGroup.position.set(0, 0, 0);
  objShip = await loadObjMtl(
    objModelShip,
    [0, 0, 0],
    [0.4, 0.4, 0.4],
    [0, -1.5, 0]
  );
  
  shipBoxHelper = new THREE.BoxHelper(objShip, 0x00ff00); 
  shipBoxHelper.visible = true;

  shipGroup.add(shipBoxHelper)
  
  //Add the ship to the group and the group to the scene
  shipGroup.add(objShip)
  scene.add(shipGroup);

}

// Function to create the Asteroid
async function createAsteroid(noAsteroids, firstTime) {
  if (firstTime) {
    asteroidsGroup = new THREE.Object3D();
    asteroidsGroup.position.set(0, -7, 20);
  }

  // radius: Entre 11 y 14.5
  let x = 0,
    y = 0;

  for (let i = 0; i < 2; i++) {
    let radius = genRand(11, 14.5, 2);
    let angle = Math.random() * Math.PI * 2;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;

    objAsteroid = await loadObjMtl(
      objModelAsteroid,
      [x, y, 0],
      [5, 5, 5],
      [0, 0, 0]
    );

    //Save the angle to change the position later
    objAsteroid.angle = angle;

    listAsteroid.push(objAsteroid);

    asteroidBoxHelper = new THREE.BoxHelper(objAsteroid, 0x00ff00); 
    asteroidBoxHelper.visible = true;
    // asteroidBoxHelper
    //asteroidBoxHelper.checkCollisions();

    asteroidsGroup.add(asteroidBoxHelper)

    //Add Box helpers to the list
    lstBoxHelpers.push(asteroidBoxHelper)

    //Add Asteroids to its group
    asteroidsGroup.add(objAsteroid);
  }

  //Add the Asteroid to the scene
  if (firstTime) scene.add(asteroidsGroup);
}

//Function to rotate the earth
function rotateEarth(angle) {
  earthGroup.rotation.z += angle;
}

//Function to rotate the asteroids
function rotateAsteroids(angle) {
  let PX = 0;
  let PY = -7;
  if (asteroidsGroup !== null) {
    asteroidsGroup.rotation.z += angle * 5;
    const coneWorldPosition = new THREE.Vector3();
    asteroidsGroup.updateMatrixWorld();

    for (let i = 0; i < listAsteroid.length; i++) {
      //Get the global position of each asteorid in the group
      listAsteroid[i].getWorldPosition(coneWorldPosition);
      //console.log(coneWorldPosition);


      //If the asteorid position is in the 1st quadrant, the postion change
      if (PX > coneWorldPosition.x && PY >= coneWorldPosition.y) {
        let radius = genRand(11, 14.5, 2);
        let x = Math.cos(listAsteroid[i].angle) * radius;
        let y = Math.sin(listAsteroid[i].angle) * radius;
        listAsteroid[i].position.set(x, y);
        // console.log(asteroidsGroup.children);
        // lstBoxHelpers[i].update();
        // asteroidsGroup.children[i].position.set(x, y);
        
      }
    }
  }
}

//Function to load the object
async function loadObjMtl(objModelUrl, position, scale, rotation) {
  try {
    const mtlLoader = new MTLLoader();

    const materials = await mtlLoader.loadAsync(objModelUrl.mtl);

    materials.preload();

    const objLoader = new OBJLoader();

    objLoader.setMaterials(materials);

    const object = await objLoader.loadAsync(objModelUrl.obj);

    object.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    object.position.x += position[0];
    object.position.y += position[1];
    object.position.z += position[2];
    object.scale.set(scale[0], scale[1], scale[2]);

    object.rotation.x = rotation[0];
    object.rotation.z = rotation[1];
    object.rotation.y = rotation[2];

    return object;
  } catch (err) {
    console.log(err);
  }
}

//Function to move the ship
function moveShip(angleShip) {
  if (shipGroup !== null) {
    let moveInY = normalize(mousePos.y, -0.5, 0.5, 1.5, 13);
    let moveInX = normalize(mousePos.x, -0.5, 0.5, -10, 5);
    shipGroup.position.y += (moveInY - shipGroup.position.y) * 0.2; 
    shipGroup.position.x += (moveInX - shipGroup.position.x) * 0.2;
    
    if (objShip !== null) objShip.rotation.x += angleShip;
  }
}

//Funtion to check collisions
function checkCollisions() {

  shipBox = new THREE.Box3().setFromObject(objShip);

  if (listAsteroid.length > 0) {
    for (let i = 0; i < listAsteroid[i].length; i++) {
      lstBoxHelpers[i].checkCollisions(); // this.cubeBBox.update(); -> update the bbox to match the cube's position
  
      let asteroidBox = new THREE.Box3().setFromObject(listAsteroid[i]); 
  
      listAsteroid[i].material = asteroidBox.intersectsBox(shipBox)
        ? Game.materials.colliding
        : console.log("collision");
    }
  }



  // this.knot.rotation.x += (Math.PI / 4) * delta;
  // this.knotBBox.update();

  // Utils.updateShadow(this.cubeShadow, this.cube);
  // 

  // let sphereBox = new THREE.Box3().setFromObject(this.sphere);
  // let cubeBox = new THREE.Box3().setFromObject(this.cube);
  // let knotBox = new THREE.Box3().setFromObject(this.knot);



  
  // game.update = function (delta) {
  //   this.knot.rotation.x += (Math.PI / 4) * delta;
  //   this.knotBBox.update();

  //   Utils.updateShadow(this.cubeShadow, this.cube);
  //   this.cubeBBox.update(); // update the bbox to match the cube's position

  //   let sphereBox = new THREE.Box3().setFromObject(this.sphere);
  //   let cubeBox = new THREE.Box3().setFromObject(this.cube);
  //   let knotBox = new THREE.Box3().setFromObject(this.knot);

  //   this.sphere.material = sphereBox.intersectsBox(cubeBox)
  //     ? Game.materials.colliding
  //     : Game.materials.solid;
  //   this.knot.material = knotBox.intersectsBox(cubeBox)
  //     ? Game.materials.colliding
  //     : Game.materials.solid;
  

  

  // this.objShip.material = shipBox.intersectsBox(cubeBox)
  //   ? Game.materials.colliding
  //   : Game.materials.solid;
  // this.knot.material = knotBox.intersectsBox(cubeBox)
  //   ? Game.materials.colliding
  //   : Game.materials.solid;
}

function initPointerLock() {
  let container_start = document.getElementById("container-start");
  let id_start = document.getElementById("id-start");

  id_start.addEventListener(
    "click",
    function () {
      //Hide the div of the instruction
      container_start.style.display = "none";
      //Give the control to move the ship
      document.addEventListener("mousemove", handleMouseMove, false);

      document.getElementById("page").style.cursor = "none";
      //Change the game status to true
      game_status = true;

      //Create asteroids
      createAsteroid(10, true);
      //Check collisions
      checkCollisions();
    },
    false
  );
}

//Function to normalize the posisition from the mouse to the object
function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + pc * dt;
  return tv;
}

function updateScore(deltat) {
  if (game_status) {
    score += 0.0099 * deltat;
    div_score.innerHTML = `Score: ${Math.floor(score)}`;

    if (Math.floor(score) % 1000 === 0 && Math.floor(score) !== 0) {
      createAsteroid(1, false);
    }
  }
}

function animate() {
  //Animate variables
  let now = Date.now();
  let deltat = now - currentTime;
  currentTime = now;

  //Rotate Earth
  rotateEarth(Math.PI * 2 * (deltat / 50000));

  //Rotate Asteroids
  rotateAsteroids(Math.PI * 2 * (deltat / 50000));

  //Move ship
  moveShip(Math.PI * 2 * (deltat / 3000));

  //Update score
  updateScore(deltat);

  checkCollisions()  


}

function update() {
  requestAnimationFrame(function () {
    update();
  });
  renderer.render(scene, camera);
  
  animate();
}

async function createScene(canvas) {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  // Create the Three.js renderer and attach it to our canvas
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

  // Set the viewport size
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Turn on shadows
  renderer.shadowMap.enabled = true;
  // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // Create a new Three.js scene
  scene = new THREE.Scene();

  //Set background
  //scene.background = new THREE.Color("rgb(65, 61, 68)");
  const loader = new THREE.TextureLoader();
  loader.load("../assets/textures/cartoon_space3.jpg", function (texture) {
    scene.background = texture;
  });

  // Add  a camera so we can view the scene
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 45;
  nearPlane = 1;
  farShip = 4000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farShip
  );

  // Add  a camera so we can view the scene
  camera.position.set(0, 5, 30);

  //Resize the page
  window.addEventListener("resize", resize, false);

}

function resize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  camera.aspect = WIDTH / HEIGHT;

  camera.updateProjectionMatrix();
  renderer.setSize(WIDTH, HEIGHT);
}

function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH) * 2;
  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

window.onload = () => {
  main();
  resize();
};

function genRand(min, max, decimalPlaces) {
  var rand = Math.random() * (max - min) + min;
  var power = Math.pow(10, decimalPlaces);
  return Math.floor(rand * power) / power;
}
