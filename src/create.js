/*
 * From https://github.com/redblobgames/dual-mesh
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 *
 * Generate a random triangle mesh for the area 0 <= x <= 1000, 0 <= y <= 1000
 *
 * This program runs on the command line (node)
 */

'use strict';

let Poisson = require('poisson-disk-sampling'); // MIT licensed
let Delaunator = require('delaunator');        // ISC licensed

function s_next_s(s) { return (s % 3 == 2) ? s-2 : s+1; }


function checkPointInequality({_r_vertex, _s_start_r, _s_opposite_s}) {
    // TODO: check for collinear vertices. Around each red point P if
    // there's a point Q and R both connected to it, and the angle P→Q and
    // the angle P→R are 180° apart, then there's collinearity. This would
    // indicate an issue with poisson disc point selection.
}


function checkTriangleInequality({_r_vertex, _s_start_r, _s_opposite_s}) {
    // check for skinny triangles
    const badAngleLimit = 30;
    let summary = new Array(badAngleLimit).fill(0);
    let count = 0;
    for (let s = 0; s < _s_start_r.length; s++) {
        let r0 = _s_start_r[s],
            r1 = _s_start_r[s_next_s(s)],
            r2 = _s_start_r[s_next_s(s_next_s(s))];
        let p0 = _r_vertex[r0],
            p1 = _r_vertex[r1],
            p2 = _r_vertex[r2];
        let d0 = [p0[0]-p1[0], p0[1]-p1[1]];
        let d2 = [p2[0]-p1[0], p2[1]-p1[1]];
        let dotProduct = d0[0] * d2[0] + d0[1] + d2[1];
        let angleDegrees = 180 / Math.PI * Math.acos(dotProduct);
        if (angleDegrees < badAngleLimit) {
            summary[angleDegrees|0]++;
            count++;
        }
    }
    // NOTE: a much faster test would be the ratio of the inradius to
    // the circumradius, but as I'm generating these offline, I'm not
    // worried about speed right now
    
    // TODO: consider adding circumcenters of skinny triangles to the point set
    if (createMesh.PRINT_WARNINGS && count > 0) {
        console.log('  bad angles:', summary.join(" "));
    }
}


function checkMeshConnectivity({_r_vertex, _s_start_r, _s_opposite_s}) {
    // 1. make sure each side's opposite is back to itself
    // 2. make sure region-circulating starting from each side works
    let ghost_r = _r_vertex.length - 1, out_s = [];
    for (let s0 = 0; s0 < _s_start_r.length; s0++) {
        if (_s_opposite_s[_s_opposite_s[s0]] !== s0) {
            console.log(`FAIL _s_opposite_s[_s_opposite_s[${s0}]] !== ${s0}`);
        }
        let s = s0, count = 0;
        out_s.length = 0;
        do {
            count++; out_s.push(s);
            s = s_next_s(_s_opposite_s[s]);
            if (count > 100 && _s_start_r[s0] !== ghost_r) {
                console.log(`FAIL to circulate around region with start side=${s0} from region ${_s_start_r[s0]} to ${_s_start_r[s_next_s(s0)]}, out_s=${out_s}`);
                break;
            }
        } while (s !== s0);
    }
}


/*
 * Add vertices evenly along the boundary of the mesh;
 * use a slight curve so that the Delaunay triangulation
 * doesn't make long thing triangles along the boundary.
 * These points also prevent the Poisson disc generator
 * from making uneven points near the boundary.
 */
function addBoundaryPoints(spacing, size) {
    let N = Math.ceil(size/spacing);
    let points = [];
    for (let i = 0; i <= N; i++) {
        let t = (i + 0.5) / (N + 1);
        let w = size * t;
        let offset = Math.pow(t - 0.5, 2);
        points.push([offset, w], [size-offset, w]);
        points.push([w, offset], [w, size-offset]);
    }
    return points;
}


function addGhostStructure({_r_vertex, _s_start_r, _s_opposite_s}) {
    const numSolidSides = _s_start_r.length;
    const ghost_r = _r_vertex.length;
    
    let numUnpairedSides = 0, firstUnpairedEdge = -1;
    let r_unpaired_s = []; // seed to side
    for (let s = 0; s < numSolidSides; s++) {
        if (_s_opposite_s[s] === -1) {
            numUnpairedSides++;
            r_unpaired_s[_s_start_r[s]] = s;
            firstUnpairedEdge = s;
        }
    }

    let r_newvertex = _r_vertex.concat([[500, 500]]);
    let s_newstart_r = new Int32Array(numSolidSides + 3 * numUnpairedSides);
    s_newstart_r.set(_s_start_r);
    let s_newopposite_s = new Int32Array(numSolidSides + 3 * numUnpairedSides);
    s_newopposite_s.set(_s_opposite_s);

    for (let i = 0, s = firstUnpairedEdge;
         i < numUnpairedSides;
         i++, s = r_unpaired_s[s_newstart_r[s_next_s(s)]]) {

        // Construct a ghost side for s
        let ghost_s = numSolidSides + 3 * i;
        s_newopposite_s[s] = ghost_s;
        s_newopposite_s[ghost_s] = s;
        s_newstart_r[ghost_s] = s_newstart_r[s_next_s(s)];
        
        // Construct the rest of the ghost triangle
        s_newstart_r[ghost_s + 1] = s_newstart_r[s];
        s_newstart_r[ghost_s + 2] = ghost_r;
        let k = numSolidSides + (3 * i + 4) % (3 * numUnpairedSides);
        s_newopposite_s[ghost_s + 2] = k;
        s_newopposite_s[k] = ghost_s + 2;
    }

    return {
        numSolidSides,
        _r_vertex: r_newvertex,
        _s_start_r: s_newstart_r,
        _s_opposite_s: s_newopposite_s
    };
}


/**
 * Create mesh data in a 1000x1000 space for passing to DualMesh
 *
 * Either pass {spacing, random} to choose random spaced points with
 * boundary points, or pass {points} to use an existing set of points
 * without added boundary points. Or pass {spacing, points, random} to 
 * use a given set of points, plus random spaced points, plus boundary
 * points.
 *
 * The mesh generator runs some sanity checks but does not correct the
 * generated points.
 *
 * This interface is insufficient to cover all the possible variants
 * so it is SUBJECT TO CHANGE.
 */
function createMesh({spacing=Infinity, points=[], random=Math.random}) {
    let generator = new Poisson([1000, 1000], spacing, undefined, undefined, random);
    let boundaryPoints = isFinite(spacing)? addBoundaryPoints(spacing, 1000) : [];
    boundaryPoints.forEach((p) => generator.addPoint(p));
    points.forEach((p) => generator.addPoint(p));
    let allPoints = generator.fill();

    let delaunator = new Delaunator(allPoints);
    let graph = {
        _r_vertex: allPoints,
        _s_start_r: delaunator.triangles,
        _s_opposite_s: delaunator.halfedges
    };

    checkPointInequality(graph);
    checkTriangleInequality(graph);
    
    graph = addGhostStructure(graph);
    graph.numBoundaryRegions = boundaryPoints.length;
    checkMeshConnectivity(graph);

    return graph;
}


createMesh.PRINT_WARNINGS = false;
module.exports = createMesh;
