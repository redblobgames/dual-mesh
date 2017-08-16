// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

'use strict';

/**
 * Represent a triangle mesh with:
 *   - Edges (e)
 *   - Vertices (v)
 *   - Triangles (t)
 *
 * Each element has an id:
 *   - 0 <= e < numEdges
 *   - 0 <= v < numVertices
 *   - 0 <= t < numTriangles
 *
 * Naming convention: x_name_y takes x (e, v, t) as input and produces
 * y (e, v, t) as output. If the output isn't a mesh index (e, v, t)
 * then the _y suffix is omitted.
 *
 * The mesh has no boundaries; it wraps around the "back" using a
 * "ghost" vertex. Some vertices are marked as the boundary; these are
 * connected to the ghost vertex. Ghost triangles and ghost edges
 * connect these boundary vertices to the ghost vertex. Elements that
 * aren't "ghost" are called "solid".
 */
class TriangleMesh {
    static e_to_t(e)   { return (e/3) | 0; }
    static e_prev_e(e) { return (e % 3 == 0) ? e+2 : e-1; }
    static e_next_e(e) { return (e % 3 == 2) ? e-2 : e+1; }

    /**
     * constructor takes partial mesh information and fills in the rest; the
     * partial information is generated in create.js or in deserialize.js
     */
    constructor ({numBoundaryVertices, numSolidEdges, vertices, edges, opposites}) {
        Object.assign(this, {numBoundaryVertices, numSolidEdges, vertices, edges, opposites});

        this.numEdges = this.edges.length;
        this.numVertices = this.vertices.length;
        this.numSolidVertices = this.numVertices - 1;
        this.numTriangles = this.numEdges / 3;
        this.numSolidTriangles = this.numSolidEdges / 3;
        
        // Construct an index for finding all edges connected to a vertex
        this.starts = new Int32Array(this.numVertices);
        for (let e = 0; e < this.edges.length; e++) {
            this.starts[this.edges[e]] = this.starts[this.edges[e]] || e;
        }

        // Construct triangle coordinates
        this.centers = new Array(this.numTriangles);
        for (let e = 0; e < this.edges.length; e += 3) {
            let a = this.vertices[this.edges[e]],
                b = this.vertices[this.edges[e+1]],
                c = this.vertices[this.edges[e+2]];
            if (this.e_ghost(e)) {
                // ghost triangle center is just outside the unpaired edge
                let dx = b[0]-a[0], dy = b[1]-a[1];
                this.centers[e/3] = [a[0] + 0.5*(dx+dy), a[1] + 0.5*(dy-dx)];
            } else {
                // solid triangle center is at the centroid
                this.centers[e/3] = [(a[0] + b[0] + c[0])/3,
                                     (a[1] + b[1] + c[1])/3];
            }
        }
    }

    e_begin_v(e)  { return this.edges[e]; }
    e_end_v(e)    { return this.edges[TriangleMesh.e_next_e(e)]; }

    e_inner_t(e)  { return TriangleMesh.e_to_t(e); }
    e_outer_t(e)  { return TriangleMesh.e_to_t(this.opposites[e]); }
    
    t_circulate_e(out_e, t) { out_e.length = 3; for (let i = 0; i < 3; i++) { out_e[i] = 3*t + i; } return out_e; }
    t_circulate_v(out_v, t) { out_v.length = 3; for (let i = 0; i < 3; i++) { out_v[i] = this.edges[3*t+i]; } return out_v; }
    t_circulate_t(out_t, t) { out_t.length = 3; for (let i = 0; i < 3; i++) { out_t[i] = this.e_outer_t(3*t+i); } return out_t; }
    
    v_circulate_e(out_e, v) {
        const e0 = this.starts[v];
        let e = e0;
        out_e.length = 0;
        do {
            out_e.push(e);
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return out_e;
    }

    v_circulate_v(out_v, v) {
        const e0 = this.starts[v];
        let e = e0;
        out_v.length = 0;
        do {
            out_v.push(this.e_end_v(e));
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return out_v;
    }
    
    v_circulate_t(out_t, v) {
        const e0 = this.starts[v];
        let e = e0;
        out_t.length = 0;
        do {
            out_t.push(TriangleMesh.e_to_t(e));
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return out_t;
    }

    ghost_v()     { return this.numVertices - 1; }
    e_ghost(e)    { return e >= this.numSolidEdges; }
    v_ghost(v)    { return v == this.numVertices - 1; }
    t_ghost(t)    { return this.e_ghost(3 * t); }
    e_boundary(e) { return this.e_ghost(e) && (e % 3 == 0); }
    v_boundary(v) { return v < this.numBoundaryVertices; }
}

module.exports = TriangleMesh;
