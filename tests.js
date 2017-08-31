// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

'use strict';

let fs = require('fs');
let tape = require('tape');
let TriangleMesh = require('./');
let createMesh = require('./create');
let serializeMesh = require('./serialize');
let deserializeMesh = require('./deserialize');

tape("encoding and decoding", function(test) {
    // Mesh spacing 5.0 lets me test the case of numVertices < (1<<16)
    // and numEdges > (1<<16), which makes the two arrays different sizes
    let meshIn = createMesh(5.0);
    let meshOut = new TriangleMesh(deserializeMesh(serializeMesh(meshIn)));
    test.equal(meshIn.numBoundaryVertices, meshOut.numBoundaryVertices);
    test.equal(meshIn.numSolidEdges, meshOut.numSolidEdges);
    test.deepEqual(meshIn.edges, meshOut.edges);
    test.deepEqual(meshIn.opposites, meshOut.opposites);
    // Floats don't survive the round trip because I write them as float32 instead of doubles;
    // I'm testing just a subset of them to reduce noise from tape
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            test.ok(Math.abs(meshIn.vertices[i][j] - meshOut.vertices[i][j]) < 0.01);
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
    let vertices = generator.fill();
    let delaunator = new Delaunator(vertices);
    for (let e1 = 0; e1 < delaunator.halfedges.length; e1++) {
        var e2 = delaunator.halfedges[e1];
        if (e2 !== -1 && delaunator.halfedges[e2] !== e1) {
            test.fail("invalid halfedge connection; data set was " + JSON.stringify(vertices));
        }
    }
    test.pass("halfedges are valid");
    test.end();
});
