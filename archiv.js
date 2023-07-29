//from crystal.js
export function getMillerPlanePositions(h,k,l){
    /*
        given miller-indices hkl this function
        calculates the vertices of the plane in the real basis 
    */
    console.log("___________________________________________________________");

    const zero = new Vector3(0,0,0);
    const a = getRealA();
    const b = getRealB();
    const c = getRealC();
    

    let result = []

    //normal vector of the planes
    const normal = getPositionInReciprocalBasis(h,k,l)

    normal.normalize();
    normal.mutliply(getMillerPlaneSpacing(h,k,l), true);

    const lines = []

    lines.push(new Line(zero, b))
    lines.push(new Line(a,b));
    lines.push(new Line(c,b));
    lines.push(new Line(a.add(c), b));

    lines.push(new Line(zero, a));
    lines.push(new Line(b,a))
    lines.push(new Line(c,a))
    lines.push(new Line(b.add(c),a))

    lines.push(new Line(zero, c));
    lines.push(new Line(a,c))
    lines.push(new Line(b,c))
    lines.push(new Line(a.add(b),c))

    const plane = new Plane(normal, normal);

    for(let i = 0; i < 1; i++){
        const temp = []


        var intercept;

        for(let j = 0; j < lines.length; j++){
            intercept = plane.interceptLine(lines[j],0,1.001);
            console.log("line: ", lines[j])
            if(intercept === undefined || temp.length >= 4){
                continue;
            }
            console.log("pushing")
            temp.push(intercept.getComponents());
        }

        result.push(temp);

        plane.point.add(normal, true);

    }


    console.log(result);
    return result;

}
