/*
 * From https://github.com/redblobgames/maps/dual-mesh/
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 */

'use strict';

let fs = require('fs');
let tape = require('tape');
let TriangleMesh = require('./');
let createMesh = require('./create');
let serializeMesh = require('./serialize');
let deserializeMesh = require('./deserialize');

tape("encoding and decoding", function(test) {
    // Mesh spacing 5.0 lets me test the case of numRegions < (1<<16)
    // and numSides > (1<<16), which makes the two arrays different sizes
    let meshIn = createMesh({spacing: 5.0});
    let meshOut = new TriangleMesh(deserializeMesh(serializeMesh(meshIn)));
    test.equal(meshIn.numBoundaryRegions, meshOut.numBoundaryRegions);
    test.equal(meshIn.numSolidSides, meshOut.numSolidSides);
    test.deepEqual(meshIn.sides, meshOut.sides);
    test.deepEqual(meshIn._s_opposite_s, meshOut._s_opposite_s);
    // Floats don't survive the round trip because I write them as float32 instead of doubles;
    // I'm testing just a subset of them to reduce noise from tape
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            test.ok(Math.abs(meshIn.r_vertex[i][j] - meshOut.r_vertex[i][j]) < 0.01);
        }
    }
    test.end();
});


let Delaunator = require('delaunator');
let Poisson = require('poisson-disk-sampling');

tape("delaunator: properly connected halfedges", function(t) {
    let points = [[122,270],[181,121],[195,852],[204,694],[273,525],[280,355],[31,946],[319,938],[33,625],[344,93],[369,793],[38,18],[426,539],[454,239],[503,51],[506,997],[516,661],[532,386],[619,889],[689,131],[730,511],[747,750],[760,285],[856,83],[88,479],[884,943],[927,696],[960,472],[992,253]];
    points = points.map((p) => [p[0] + Math.random(), p[1]]);
    var d = new Delaunator(points);
    for (var i = 0; i < d.halfedges.length; i++) {
        var i2 = d.halfedges[i];
        if (i2 !== -1 && d.halfedges[i2] !== i) {
            t.fail('invalid halfedge connection');
        }
    }
    t.pass('halfedges are valid');
    t.end();
});

tape("delaunator: properly connected halfedges, random set", function(test) {
    // NOTE: this is not a great test because the input data is
    // different each time; need to switch to a deterministic random
    // number generator
    let generator = new Poisson([1000, 1000], 50.0);
    let points = generator.fill();
    let delaunator = new Delaunator(points);
    for (let e1 = 0; e1 < delaunator.halfedges.length; e1++) {
        var e2 = delaunator.halfedges[e1];
        if (e2 !== -1 && delaunator.halfedges[e2] !== e1) {
            test.fail("invalid halfedge connection; data set was " + JSON.stringify(points));
        }
    }
    test.pass("halfedges are valid");
    test.end();
});
