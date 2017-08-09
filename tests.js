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

