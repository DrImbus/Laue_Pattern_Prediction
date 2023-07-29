import { rectContains, clamp, atan2, round, abs } from './utility.js';
import * as CRYSTAL from './crystal.js'

import { Vector3 } from './linear_algebra.js';

import * as THREE from '../node_modules/three/build/three.module.js'

var mid_x;
var mid_y;
var x_unit_2_pixel = 4;
var y_unit_2_pixel = 4;
var cutout_radius = 2
var screen_width = 100//mm
var screen_height = 100//mm

const canvasContainer = document.getElementById('laue-picture-container')
const canvas = canvasContainer.getElementsByTagName('canvas')[0];
const context = canvas.getContext('2d');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight; 
mid_x = canvas.width/2;
mid_y = canvas.height/2;


/**
 * saving all elements for infobox handling
 */

const infobox_container = document.getElementById("laue-infobox-container")
const infobox_prefab = infobox_container.firstElementChild.outerHTML;

/**
 * jus to check if click is on the laue picture or the ui
 */
const laue_picture_ui = document.getElementById("laue-picture-ui")


const highlightedHKL = []
let currentlySelectedHKL = undefined

window.onresize = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    mid_x = canvas.width/2;
    mid_y = canvas.height/2;
    updateCanvas();
}


//changes the size based on intensity
export function size_function(x){
    const min_value = 0.2//0.01
    const steepness = 3
    const max_increase = min_value*2//0.075
    const max_value = min_value*10
    const result = Math.min(max_increase*Math.exp(x*steepness)/Math.exp(steepness)+min_value, max_value)
    return(result)
}

//transform physical coordinate to screen coordinate
function p2s(position){
    return [position[0]*x_unit_2_pixel+mid_x, position[1]*(-y_unit_2_pixel)+mid_y]
}

//inverse of p2s => transform screen coordinates (in pixel) to physical coordinates (in mm):
function s2p(screenPosition){
    const screenX = screenPosition[0]-canvasContainer.getBoundingClientRect().x
    const screenY =canvasContainer.getBoundingClientRect().height - (screenPosition[1]-canvasContainer.getBoundingClientRect().y);
    
    return[(screenX-mid_x)/x_unit_2_pixel,(screenY-mid_y)/y_unit_2_pixel]
}

function l2s(length){
    return length*(x_unit_2_pixel+y_unit_2_pixel)/2;
}

export function getHalfDiagonal(){
    const pixelWidth = canvas.width;
    const pixelHeight = canvas.height;   
    const physicalWidth = pixelWidth/x_unit_2_pixel
    const physicalHeight = pixelHeight/y_unit_2_pixel

    return Math.sqrt(physicalWidth**2+physicalHeight**2)/2
}

function drawPoint(pos,color='white', size=0.05){
    context.beginPath();
    const screen_pos = p2s(pos)
    context.arc(screen_pos[0], screen_pos[1], l2s(size), 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 0;
}

function drawCircle(pos, color="red",radius,lineWidth){
    context.beginPath();
    const screen_pos = p2s(pos)
    context.arc(screen_pos[0], screen_pos[1], l2s(radius), 0, 2 * Math.PI, false);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.stroke();
    
}

function drawRect(x_min, y_min, width, height, fill_color="black" ,stroke_color = "red", line_width = 1){
    const bottomLeftCorner = p2s([x_min,y_min])

    context.fillStyle = fill_color;
    context.fillRect(bottomLeftCorner[0],bottomLeftCorner[1], l2s(width), -l2s(height));

    context.strokeStyle = 'red';
    context.lineWidth = line_width;
    
    
    //draw rect draws the y-axis in the opposite direction thats why the height has minus sign
    context.strokeRect(bottomLeftCorner[0],bottomLeftCorner[1], l2s(width), -l2s(height));
    
}

function drawLine(start_pos, end_pos, color='black', size = 1){
    context.beginPath();
    const start_screen_pos = p2s(start_pos)
    const end_screen_pos = p2s(end_pos)

    context.moveTo(start_screen_pos[0], start_screen_pos[1]);
    context.lineTo(end_screen_pos[0], end_screen_pos[1]);

    context.strokeStyle = color;
    context.lineWidth = size;
    context.stroke();
}

export function updateCanvas(){   
    const reflections = CRYSTAL.getLaueReflections();

    
/*
    const points = []
    const intensities = []
    for(let i = 0; i < reflections.length; i++){
        points.push(reflections[i].screen_position)
        intensities.push(reflections[i].intensity)
    }*/
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `rgb(${50},${50},${50})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    drawRect(-screen_width/2, -screen_height/2,screen_width,screen_height)

    //draw coordinates
    drawLine([0,0], [10,0], "red",  1);//5mm
    drawLine([0,0], [0,10], "green",  1);//5mm
    drawCircle([0,0],"red",cutout_radius, 0.5)

    let min_angle = 10000
    let max_angle = 0
    var counter = 0

    clearInfoBoxes();

    for(let i = 0; i < reflections.length; i++){
        const color = `rgb(255,255,255,${reflections[i].intensity})`
        drawPoint(reflections[i].screen_position, color, size_function(reflections[i].intensity) ) //size  = 0.05
        
        if(reflectionIsHighlighted(reflections[i])){
            displayReflectionInfo(reflections[i])
        }
        counter++
    }
}

/****************************************

            FUNCTIONS FOR UI INPUT

****************************************/


export function contains(x,y){
    return rectContains(canvasContainer.getBoundingClientRect(), x,y);
}



function getScale(){
    return [x_unit_2_pixel, y_unit_2_pixel]
}

function setScale(x_pixels,y_pixels){
    x_unit_2_pixel = clamp(x_pixels, 4, 100);
    y_unit_2_pixel = clamp(y_pixels, 4, 100);
    updateCanvas();
}

export function setScreenWidth(w){
    screen_width = w
}

export function setScreenHeight(h){
    screen_height = h
}

export function setCutoutRadius(x){
    cutout_radius = x;
}


export function zoom(deltaZ){
    deltaZ *= -1;
    const max_zoom = 200
    const min_zoom = 3

    const currentScale = getScale();
    setScale(currentScale[0] * (1+deltaZ/10), currentScale[1]*(1+deltaZ/10))
}

/**
 * rotates the crystal such that deltaX moves a spot along
 * the x-axis in the laue-picture etc.
 */
export function move(deltaX, deltaY){
    //console.log("moving")
}

export function getReflectionAt(x,y, lock = false){
    const mousePos = s2p([x,y]);
    const reflections = CRYSTAL.getLaueReflections();
    let minReflection = reflections[0];
    let minDistance = Math.sqrt((mousePos[0]-minReflection.screen_position[0])**2+(mousePos[1]-minReflection.screen_position[1])**2);
    for(let i = 1; i < reflections.length; i++){
        const lauePos = reflections[i].screen_position;
        const distance = Math.sqrt((mousePos[0]-lauePos[0])**2+(mousePos[1]-lauePos[1])**2);
        if(distance < minDistance){
            minReflection = reflections[i]
            minDistance = distance
        }
    }
    if(lock){
        highlightedHKL.push(minReflection.laue_index)
        updateCanvas()
    }else{
        currentlySelectedHKL = minReflection.laue_index
        updateCanvas()
    }
   
}

function reflectionIsHighlighted(reflection){
    const hkl = reflection.laue_index;
    if(!(currentlySelectedHKL === undefined))
    {
        if(currentlySelectedHKL[0] == hkl[0] &&currentlySelectedHKL[1] == hkl[1] &&currentlySelectedHKL[2] == hkl[2]){
            return true;
        }
    }
        
    for(let i = 0; i < highlightedHKL.length; i++){
        const testHKL = highlightedHKL[i]
        if(testHKL[0] == hkl[0] && testHKL[1] == hkl[1] && testHKL[2] == hkl[2]){
            return true;
        }
    }
    return false;
}

function displayReflectionInfo(reflection){
    drawCircle(reflection.screen_position,"green",2,2)
    addInfoBox(reflection);
}

function clearInfoBoxes(){
    while(infobox_container.firstChild){
        infobox_container.firstChild.remove()
    }
}

function addInfoBox(reflection){
    const placeholder = document.createElement("div");
    

    infobox_container.append(placeholder)
    placeholder.outerHTML = infobox_prefab;
    const infoBox = infobox_container.lastElementChild

    //setting the screenposition of the infobox
    const screenPosition = p2s(reflection.screen_position)
    infoBox.style.left=(screenPosition[0]+5+"px");
    infoBox.style.top=(screenPosition[1]+5+"px");
    
    
    //setting the content of the infobox
    infoBox.children[0].innerHTML = "index: "+reflection.laue_index[0]+" "+reflection.laue_index[1]+" "+reflection.laue_index[2]
    infoBox.children[1].innerHTML = "intensity: "+round(reflection.intensity,2)
    infoBox.children[2].innerHTML = "count: "+reflection.count
}

export function clickInBoundingBox(mouseX,mouseY){

    if(rectContains(laue_picture_ui.getBoundingClientRect(), mouseX,mouseY)){
        console.log("laue ui intersects")
        return false;
    }

    console.log("checking: ",mouseX,",",mouseY)
    const physicalPos = s2p([mouseX,mouseY])
    if(abs(physicalPos[0]) > screen_width/2){
        return false
    }
    if(abs(physicalPos[1]) > screen_height/2){
        return false
    }
    return true
}

