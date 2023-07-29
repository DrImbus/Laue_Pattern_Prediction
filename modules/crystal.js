/*
-saves all the lattice constants
-calculates the real- and reciprocal-lattice-vectors
in the lab-system (takes rotation into account)
-calculates normal-vectors of miller-plane hkl aswell as the laue pattern
-takes xray spectrum into account
*/

import { Vector3, Plane, Line, rotateEulerAngles} from "./linear_algebra.js";
import { sqrt, cos, sin , getHKL, round, atan2, abs} from "./utility.js";

import atom_properties from "../atom_properties.json" assert { type: "json" };
import * as LAUE_VIEW from "./laue_view.js";


/**************************************************

                    VARIABLES

**************************************************/

//rotation of the crystal
var x_rotation;
var y_rotation;
var z_rotation;
var screen_distance = 15;  //mm
var cutout_radius = 1;    //mm
var screen_width = 100 //mm
var screen_height = 100 //mm


//lattice constants
var a_constant;
var b_constant;
var c_constant;
var alpha_constant;
var beta_constant;
var gamma_constant;

//these are the coordinates of the basis_atoms in the real basis
var basis_atoms_position = [];
/**
 * atomic factors of each atom
 * this is used to acces the other properties (color, radius and the atomic form factor parameters)
 * from atom_properties.json
*/
var atom_types = [];
let atom_colors = [];
let atom_radius = [];
let form_factor_parameters = []

//settings for calculating the laue_pattern
var consider_structure_factor = true
var consider_spectrum = true
var normalize_brightest = true
var maxHKL = 2

/**
 * miller indices are pre-calculated to save time
 */
var all_hkl = []
var all_hkl_spacing = []

/**
 * hkl are filtered by
 *  -
 */
var filtered_hkl = []

//lab settings
var incidentBeam = new Vector3(-1,0,0)

//minimum wavelength of the incoming xrays
var min_lambda = 0

/**
 * the result of the laue reflection calculation
 * is stored in here. It is acceses by the laue_view script via the getLaueReflections function
 */

var visible_hkl = [];
var positions = [];
var intensities = [];

var reflections = [];

/**************************************************

                SETTER FUNCTIONS

**************************************************/

export function setAllConstants(a,b,c,alpha,beta,gamma){
    a_constant = a;
    b_constant = b;
    c_constant = c;
    alpha_constant = alpha;
    beta_constant = beta;
    gamma_constant = gamma;

}

export function setRotation(x,y,z){
    x_rotation = x;
    y_rotation = y;
    z_rotation = z;
}

export function setXRot(x){
    x_rotation = x
}

export function setYRot(y){
    y_rotation = y
}

export function setZRot(z){
    z_rotation = z
}

export function setCutoutRadius(r){
    cutout_radius = r;
}

export function setScreenDistance(d){
    screen_distance = d;
}

export function setScreenWidth(w){
    screen_width = w
}

export function setScreenHeight(h){
    screen_height = h
}

export function setA(a){
    a_constant = a;

    
}

export function setB(b){
    b_constant = b;
}

export function setC(c){
    c_constant = c;
}

export function setAlpha(alpha){
    alpha_constant = alpha;
    
}

export function setBeta(beta){
    beta_constant = beta;
}

export function setGamma(gamma){
    gamma_constant = gamma;
}


export function set_min_lambda(l){
    min_lambda = l
}

export function setMaxHKL(maxHKLParam){
    maxHKL = maxHKLParam
}

export function set_consider_structure_factor(consider){
    consider_structure_factor = consider
}
export function set_consider_spectrum(consider){
    consider_spectrum = consider
}
export function set_normalize_brightest(normalize){
    normalize_brightest = normalize
}


/**
 * calculate all the miller-indices and the spacing of the planes 
 * in advance to save time
 */
export function calculateHKL(){
    
    all_hkl = getHKL(100)
    for(let i = 0; i < all_hkl.length; i++){
        all_hkl_spacing[i] = getMillerPlaneSpacing(all_hkl[i][0],all_hkl[i][1],all_hkl[i][2])
    }
}


/**************************************************

            GETTER FUNCTIONS

**************************************************/

/**
 * getRealA/B/C() return the axis vectors oh the crystal either in meters (unit = "m") or 
 * angstrom (unit = "A") and either in the lab system (rotated = true) or with 
 * A pointing along the x-axis; B in the x-y-plane and C completing the right-handed system.
 */
export function getRealA(rotated = false, unit = "m"){
    const result = new Vector3(a_constant, 0,0)
    if(rotated){
        result.rotate(x_rotation,y_rotation,z_rotation,true);
    }
    if(unit == "A"){
        result.mutliply(10**10,true)
    }
    return result
}
export function getRealB(rotated = false,unit="m"){
    const result = new Vector3(cos(gamma_constant)*b_constant, sin(gamma_constant)*b_constant,0)
    if(rotated){
        result.rotate(x_rotation,y_rotation,z_rotation,true);
    }
    if(unit == "A"){
        result.mutliply(10**10,true)
    }
    return result
}
export function getRealC(rotated = false, unit="m"){
    const result = new Vector3(
        cos(beta_constant)*c_constant,
        cos(alpha_constant)*sin(gamma_constant)*c_constant,
        sqrt(1-cos(beta_constant)**2 - (cos(alpha_constant)*sin(gamma_constant))**2) * c_constant
        )
    if(rotated){
        result.rotate(x_rotation,y_rotation,z_rotation,true);
    }
    if(unit == "A"){
        result.mutliply(10**10,true)
    }
    return result;
}

/**
 * getReciprocalA/B/C() returns the reciprocal axis vectors oh the crystal either in 1/meters (unit = "m") or 
 * 1/angstrom (unit = "A") and either in the lab system (rotated = true) or with 
 * A pointing along the x-axis; B in the x-y-plane and C completing the right-handed system.
 */
export function getReciprocalA(rotated = false, unit="m"){
    const a_vector = getRealA(rotated,unit)
    const b_vector = getRealB(rotated,unit)
    const c_vector = getRealC(rotated,unit)
    const Volume = Vector3.dot(a_vector, Vector3.cross(b_vector,c_vector))
    return Vector3.cross(b_vector, c_vector).mutliply(1/Volume)
}
export function getReciprocalB(rotated = false,unit="m"){
    const a_vector = getRealA(rotated,unit)
    const b_vector = getRealB(rotated,unit)
    const c_vector = getRealC(rotated,unit)
    const Volume = Vector3.dot(a_vector, Vector3.cross(b_vector,c_vector))
    return Vector3.cross(c_vector, a_vector).mutliply(1/Volume)
}
export function getReciprocalC(rotated = false,unit="m"){
    const a_vector = getRealA(rotated,unit)
    const b_vector = getRealB(rotated,unit)
    const c_vector = getRealC(rotated,unit)
    const Volume = Vector3.dot(a_vector, Vector3.cross(b_vector,c_vector))
    return Vector3.cross(a_vector, b_vector).mutliply(1/Volume)
}

/**
 * check if the input-angles (for the lattice parameters) are valid
 * angles for example not all angles can be 179°
 */
export function validAngles(alpha,beta,gamma){
    return (cos(beta))**2-(cos(alpha)*sin(gamma))**2 < 1
}

/**
 * takes the atom positions and types as input and saves them in basis_atoms/types
 * the different atom_properties are read from atom_properties.json
 */
export function setBasisAtoms(positions, types_of_atoms){
    basis_atoms_position = positions;
    atom_types = types_of_atoms;   
    form_factor_parameters = []
    atom_radius = []
    atom_colors = []
    atom_types.forEach(type => {
        if((type in atom_properties)){
            atom_radius.push(atom_properties[type].radius/100) //atom radii in angstrom
            atom_colors.push(atom_properties[type].color)
            form_factor_parameters.push({
                                a1:atom_properties[type].a1,
                                b1:atom_properties[type].b1,
                                a2:atom_properties[type].a2,
                                b2:atom_properties[type].b2,
                                a3:atom_properties[type].a3,
                                b3:atom_properties[type].b3,
                                a4:atom_properties[type].a4,
                                b4:atom_properties[type].b4,
                                c:atom_properties[type].c
                            })
        }
        //atomic_form_factors.push(atom_properties[type].form_factor)
        //atom_sizes.push(atom_properties[type].radius/100) //atom radii in angstrom
        //atom_colors.push(atom_properties[type].color)
    }) 
}

/**
 * calculate position in the real basis
 */
function getPositionInRealBasis(x,y,z, rotated_crystal = false, unit="m"){
    const result = getRealA(rotated_crystal, unit).mutliply(x);
    result.add(getRealB(rotated_crystal, unit).mutliply(y), true);
    result.add(getRealC(rotated_crystal, unit).mutliply(z), true);
    return result;
}

/**
 * calculate position in the reciprocal basis
 */
function getPositionInReciprocalBasis(x,y,z, rotated_crystal = false, unit="m"){
    const result = getReciprocalA(rotated_crystal, unit).mutliply(x);
    result.add(getReciprocalB(rotated_crystal, unit).mutliply(y), true);
    result.add(getReciprocalC(rotated_crystal, unit).mutliply(z), true);
    return result;
}

//what unit is G supposed to be for the form-factor???TODO
export function getG(h,k,l){
    const recicrocalLatticeVector = getPositionInReciprocalBasis(h,k,l)
    return sqrt(Vector3.dot(recicrocalLatticeVector, recicrocalLatticeVector))
}

/**
 * calculate the spacing of miller-planes
 */
export function getMillerPlaneSpacing(h,k,l){
    const recLatticeVector = getPositionInReciprocalBasis(h,k,l);
    return 1/sqrt(Vector3.dot(recLatticeVector,recLatticeVector));
}

/**
 * calculate the position of atoms in the real basis
 * used by basis_view
 */
export function getAtomPositions(unit="m"){
    const result = []
    for(let i = 0; i < basis_atoms_position.length; i++){
        result.push(getPositionInRealBasis(...basis_atoms_position[i], false, unit))
    }
    return result;
}

export function getAtomSizes(){
    return atom_radius;
}

export function getAtomColors(){
    return atom_colors;
}

function sigmoid(x,a){
    return (1/(1+Math.exp(-x*a)) - 0.5) * 2
}

function contrast(x){
    return x**(1/4)
    //return sigmoid(x,1)/sigmoid(1,1)
}

/**
 * central function of the whole program!
 * takes maxHKLParam as input (if nothing is set it )
 */
var totalTime = 0
var totalCount = 0

export function calculateLaueReflections(maxHKLParam = maxHKL){
    const startTime = Date.now()
    /**
     * calculate the laue spots on a detector at (dtectorX,0,0)
     * caused by an incidentBeam
     */
    //empty the result arrays
    visible_hkl = [];
    positions = [];
    intensities = [];
    //eventually to be replaced by 
    reflections = [];


    const temp_filtered_hkl = []
    filtered_hkl = []
    for(let i = 0; i < all_hkl.length; i++){
        /**
         * to improve perfomance all_hkl (h+k+l < 100) are filtered by several conditions
         * -h+k+l < maxHKL
         * -angle between G and e_x > arctan(radius_cutout/distance_screen) 
         *      => there is an empty disc of radius radius_cutout in the middle of the screen
         * -todo: angle between G and e_x < arctan(diagonal_screen/distance_screen)
         *      => only calculate reflections that are visible
         */       
        //const angle_G_xAxis = Vector3.getAngle(getPositionInReciprocalBasis(all_hkl[i][0],all_hkl[i][1],all_hkl[i][2],true), new Vector3(1,0,0))
        if((Math.abs(all_hkl[i][0]) +Math.abs(all_hkl[i][1])  +Math.abs(all_hkl[i][2]) ) < maxHKLParam ){
            temp_filtered_hkl.push(all_hkl[i])
        }
    }

    /*
    const halfScreenDiagonal = LAUE_VIEW.getHalfDiagonal()
    let minAngle = atan2(cutout_radius, screen_distance)
    let maxAngle = atan2(halfScreenDiagonal, screen_distance)
    
    for(let i = 0; i < temp_filtered_hkl.length; i++){
        const hkl = temp_filtered_hkl[i]
        const angle_G_xAxis = Vector3.getAngle(getPositionInReciprocalBasis(hkl[0],hkl[1],hkl[2], true), new Vector3(1,0,0))
        if(angle_G_xAxis > minAngle/2 && angle_G_xAxis < maxAngle/2){
            filtered_hkl.push(hkl)
        }
    }*/

    /**
     * temp_filtered_hkl is further refined by 
     * -removing G's that point outside of the screen defined by a rectangle
     * with width, height and distance from the crystal
     * -removing G's that are inside a cutout circle in the middle of the screen
     * defined by a radius
     */
    
    const minCutoutAngle = atan2(cutout_radius, screen_distance)
    for(let i = 0; i<  temp_filtered_hkl.length; i++){
        //if a give G does not violate any of these conditions it is added to filter_hkl 
        //and thus considered in the calculation of the laue image
        const hkl = temp_filtered_hkl[i]
        const G = getPositionInReciprocalBasis(hkl[0],hkl[1],hkl[2],true)
        const angle_G_xAxis = Vector3.getAngle(G, new Vector3(1,0,0))
        if(angle_G_xAxis < minCutoutAngle/2){
            continue
        }
        
        const pointScreenIntercept = G.getInterceptOnYZPlaneAt(screen_distance)
        if(pointScreenIntercept === undefined || pointScreenIntercept == "no intercept"){//G doesnt even intercept the screen so it doesnt have to be considered
            continue
        }
        if(abs(pointScreenIntercept[0]) > screen_width/4 || abs(pointScreenIntercept[1]) > screen_height/4){
            continue
        }
        filtered_hkl.push(hkl)
    }


    //keep track of the maxIntensity so we can normalize it later
    var maxIntensity = 0;
    for(let i = 0; i < filtered_hkl.length; i++){

        const hkl = filtered_hkl[i]


        //calculate the normal of the plane 
        const normalVector = getPositionInReciprocalBasis(hkl[0],hkl[1],hkl[2], true);
        
        //reflect the incidentBeam by the normal_vector
        const reflectedBeam = Vector3.reflect(incidentBeam, normalVector);

        //calculate the interception of the reflected beam with the photo-plate
        let reflect = reflectedBeam.getInterceptOnYZPlaneAt(screen_distance);
        
        /**
         * somehow the condition to filter out reflects outside of the rectangle 
         * by removing G's outside the recangle half-widht and half-height doesnt work perfectly
         * for widht, height > 15 => the reflects outside of the rect are filtered out here
         */
        if(reflect === undefined){
            continue
        }
        if(abs(reflect[0]) > screen_width/2 || abs(reflect[1]) > screen_height/2){
            continue
        }

        //if the beam doesnt hit the plate it is undefined
        //=> only proceed with this reflec when it hit the screen 
        if(!(reflect === undefined)){
            //save the position and index of the reflex
            positions.push(reflect);
            visible_hkl.push(filtered_hkl[i])

            /**
             * calculate its intensity determined by the spectrum and the structure_factor
             * 
             */
            if(consider_spectrum || consider_structure_factor){
                //the default intensity of every point is
                let temp_intensity = 1
                if(consider_spectrum){
                    /**
                     * the angle between the incoming ray and the plane 
                    */
                    const angle = 90-Vector3.getAngle(reflectedBeam, normalVector);
                    const wavelength = 2*getMillerPlaneSpacing(hkl[0],hkl[1],hkl[2])*sin(angle)
                    temp_intensity *= getSpectrum(wavelength)
                    temp_intensity*=wavelength**4/sin(angle)**2
                    temp_intensity*=(1+cos(2*angle)^2)/2
                    //temp_intensity *= getSpectrum(wavelength)*1/(sin(angle)*sin(2*angle))
                    


                }
                if(consider_structure_factor){
                    temp_intensity *= getAbsoluteStructureFactor(hkl[0],hkl[1],hkl[2])
                }
                intensities.push(temp_intensity)
                if(temp_intensity > maxIntensity){
                    maxIntensity = temp_intensity
                }
            }else{
                intensities.push(1);
            }
        } 
    }
    //console.log("number of spots: ", positions.length)

    const positionsBackup = [...positions]
    const intensitiesBackup = [...intensities]
    /**
     * Summarise all reflections such that (100), (200), (300) with intensities 0.8, 0.7,0.1
     * combine to just (100) with an intensity of 1.6
     * (They all land on the same spot on the screen)
     */
    const temp_reflections = [];
    let safetycounter = 0
    while(visible_hkl.length > 0 && safetycounter < 10000){
        const temp_result = []
        let currentHKL = visible_hkl[0]
        let counter = 0
        while(counter < visible_hkl.length){
            const element_to_compare = visible_hkl[counter]
            if(hkl_is_multiple(currentHKL,element_to_compare)){
                if(intensities[counter] != 0){
                    temp_result.push({
                        laue_index:element_to_compare,
                        screen_position:positions[counter],
                        intensity: intensities[counter]
                    })
                }
                const index_to_remove = visible_hkl.indexOf(element_to_compare)
                visible_hkl.splice(index_to_remove,1)
                positions.splice(index_to_remove,1)
                intensities.splice(index_to_remove,1)
            }else{
                counter++;
            }
            
        }
        if(temp_result.length > 0){
            temp_reflections.push(temp_result)
        }
        
        safetycounter++;
    }
    reflections = []
    for(let i = 0; i < temp_reflections.length; i++){
        if(temp_reflections[i].length == 0){
            continue
        }
        let sum_intensities = 0
        let numberOfOverlappingReflections = 0
        for(let j = 0; j < temp_reflections[i].length; j++){
            sum_intensities+=temp_reflections[i][j].intensity
            numberOfOverlappingReflections++;
        }
        reflections.push({
            laue_index: temp_reflections[i][0].laue_index,
            screen_position: temp_reflections[i][0].screen_position,
            intensity: sum_intensities,
            count : numberOfOverlappingReflections
        })
    }



    intensities = intensitiesBackup
    positions = positionsBackup

    const empty_radius = 2

    //new logic
    if(normalize_brightest){
        let maxIntensity = 0
        for(let i = 0; i < reflections.length; i++){
            if(reflections[i].intensity > maxIntensity){
                maxIntensity = reflections[i].intensity
            }
        }

        if(maxIntensity > 0){
            for(let i = 0; i < reflections.length; i++){
                reflections[i].intensity = reflections[i].intensity/maxIntensity
                reflections[i].intensity = contrast(reflections[i].intensity)//reflections[i].intensity**(1/4)
            }
        }
    }
    if(normalize_brightest && maxIntensity > 0){
        for(let i = 0; i < intensities.length; i++){3
            intensities[i] /= maxIntensity
        }
    }
    //console.log("time: ",Date.now()-startTime)
    totalTime+= Date.now()-startTime
    totalCount+=1
    //console.log("averageTime:", totalTime/totalCount)
}

export function getLaueReflections(){
    return reflections//[positions, intensities];
}

export function kramer(lambda,lambdaMin){
    //distribution of bremsstrahlung
    //max at 2*m (m = lambda_min)
    return (lambda/lambdaMin-1)*1/(lambda**3)
}

export function getSpectrum(lambda){
    if(lambda > min_lambda){
        return kramer(lambda,min_lambda)/kramer(1.5*min_lambda, min_lambda);
    }
    return 0
}

function getFormFactor(G,atom_index){
    //return 1
    G*=10**(-10)
    const parameters = form_factor_parameters[atom_index]
    let result = parameters.c
    result+=parameters.a1*Math.exp(-parameters.b1*(G/(4*Math.PI))**2)
    result+=parameters.a2*Math.exp(-parameters.b2*(G/(4*Math.PI))**2)
    result+=parameters.a3*Math.exp(-parameters.b3*(G/(4*Math.PI))**2)
    result+=parameters.a4*Math.exp(-parameters.b4*(G/(4*Math.PI))**2)


    return result
}

export function getAbsoluteStructureFactor(h,k,l){
    let result = 0
    for(let i = 0; i < basis_atoms_position.length; i++){
        for(let j = 0; j < basis_atoms_position.length; j++){
            result+=getFormFactor(getG(h,k,l),i)*
                    getFormFactor(getG(h,k,l),j)*
                    cos(2*Math.PI*(
                        h*(basis_atoms_position[i][0]-basis_atoms_position[j][0])+
                        k*(basis_atoms_position[i][1]-basis_atoms_position[j][1])+
                        l*(basis_atoms_position[i][2]-basis_atoms_position[j][2])
                    ))
        }
    }
    return(result)
}

function hkl_is_multiple(hkl1,hkl2){
    let multiple = undefined
    if((hkl1[0] == 0 && hkl2[0] != 0)||(hkl1[0] != 0 && hkl2[0] == 0)){
        return false
    }
    if((hkl1[1] == 0 && hkl2[1] != 0)||(hkl1[1] != 0 && hkl2[1] == 0)){
        return false
    }
    if((hkl1[2] == 0 && hkl2[2] != 0)||(hkl1[2] != 0 && hkl2[2] == 0)){
        return false
    }
    if(hkl1[0] != 0 && hkl2[0] != 0){
        multiple = hkl1[0]/hkl2[0]
    }
    if(hkl1[1] != 0 && hkl2[1] != 0){
        if(multiple === undefined){
            multiple = hkl1[1]/hkl2[1]
        }else{
            if(multiple != hkl1[1]/hkl2[1]){
                return false
            }
        }
    }
    if(hkl1[2] != 0 && hkl2[2] != 0){
        if(!(multiple === undefined)){
            if(multiple != hkl1[2]/hkl2[2]){
                return false
            }
        }
    }
    return true

}


