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

import express from "express";
import morgan  from "morgan";

const IN_PORT  = 8088;
const PREFIX   = '/api/v1alpha1/';

export async function ApiStart() {
    const app = express();
    //
    // Place the health-check before the log spec so health probes don't pollute the logs.
    //
    app.get('/healthz', (req, res) => {
        res.status(200).send('Ok');
    });

    app.use(morgan(':remote-addr :remote-user :method :url :status :res[content-length] :response-time ms'));

    app.get(PREFIX + 'services', async (req, res) => {
        res.status(200).send('Ok');
    });

    app.get(PREFIX + 'services/:sname/instances', async (req, res) => {
        res.status(200).send('Ok');
    });

    app.get(PREFIX + 'services/:sname/instances/:iname', async (req, res) => {
        res.status(200).send('Ok');
    });

    app.put(PREFIX + 'services/:sname/instances/:iname/activate', async (req, res) => {
        res.status(200).send('Ok');
    });

    app.put(PREFIX + 'services/:sname/instances/:iname/deactivate', async (req, res) => {
        res.status(200).send('Ok');
    });

    let server = app.listen(IN_PORT, () => {
        let host = server.address().address;
        let port = server.address().port;
        if (host[0] == ':') {
            host = '[' + host + ']';
        }
        console.log(`Dispatch Server listening on http://${host}:${port}`);
    });
}