/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

"use strict";

const kube        = require('./kube.js');
const apiserver   = require('./apiserver.js');
const Log         = require('./log.js').Log;
const Flush       = require('./log.js').Flush;

const VERSION     = '0.1.0';
const STANDALONE  = (process.env.DMC_STANDALONE || 'NO') == 'YES';

Log(`Dynamic Multichannel Controller for Skupper version ${VERSION}`);
Log(`Standalone : ${STANDALONE}`);

//
// This is the main program startup sequence.
//
exports.Main = async function() {
    try {
        await kube.Start(!STANDALONE);
        await apiserver.Start();
        Log("[Controller initialization completed successfully]");
    } catch (reason) {
        Log(`Controller initialization failed: ${reason.stack}`)
        Flush();
        process.exit(1);
    };
};

